import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

import { prisma } from '../../db/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../httpErrors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { getListAccessOrThrow, getTaskAccessOrThrow } from '../../domain/rbac/projectAccess.js';
import { assertNotArchived } from '../../domain/guards/archiveGuards.js';
import { assertAssigneesBelongToProject } from '../../domain/tasks/assignees.js';
import { assertTaskMutable, assertStatusTransition } from '../../domain/tasks/taskStateMachine.js';
import { assertWipAllowsAdd, WipLimitError } from '../../domain/wip/wipPolicy.js';
import { generateBetween } from '../../domain/ordering/position.js';
import { moveTaskWithRetry } from '../../domain/tasks/moveTask.js';
import { withIdempotency } from '../../domain/idempotency/idempotencyService.js';
import { publish } from '../../realtime/publish.js';
import { sanitizeOptionalPlainText, sanitizePlainText } from '../../domain/safety/sanitize.js';

const createTaskSchema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.number().int().optional(),
    assigneeIds: z.array(z.string().uuid()).optional(),
    idempotencyKey: z.string().min(1).optional(),
});

const updateTaskSchema = z.object({
    expectedVersion: z.number().int().positive(),
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    priority: z.number().int().optional(),
    assigneeIds: z.array(z.string().uuid()).optional(),
});

const moveTaskSchema = z.object({
    expectedVersion: z.number().int().positive(),
    toListId: z.string().uuid(),
    beforeTaskId: z.string().uuid().nullable().optional(),
    afterTaskId: z.string().uuid().nullable().optional(),
    wipOverrideReason: z.string().nullable().optional(),
});

const updateStatusSchema = z.object({
    expectedVersion: z.number().int().positive(),
    status: z.enum(['open', 'in_progress', 'blocked', 'done', 'archived']),
});

const archiveSchema = z.object({
    expectedVersion: z.number().int().positive(),
});

function mapTask(t: {
    id: string;
    projectId: string;
    boardId: string;
    listId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    priority: number | null;
    position: string;
    status: string;
    version: number;
    createdByUserId: string;
    createdAt: Date;
    updatedAt: Date;
    assignees: { userId: string }[];
}) {
    return {
        id: t.id,
        projectId: t.projectId,
        boardId: t.boardId,
        listId: t.listId,
        title: t.title,
        description: t.description,
        dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
        priority: t.priority,
        position: t.position,
        status: t.status,
        version: t.version,
        createdByUserId: t.createdByUserId,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
        assigneeIds: t.assignees.map((a) => a.userId),
    };
}

export const tasksRoutes: FastifyPluginAsync = async (app) => {
    app.get('/lists/:listId/tasks', { preHandler: [requireAuth] }, async (request) => {
        const listId = (request.params as { listId: string }).listId;
        await getListAccessOrThrow({ listId, userId: request.user!.id, minRole: 'viewer' });

        const tasks = await prisma.task.findMany({
            where: { listId },
            orderBy: [{ position: 'asc' }, { id: 'asc' }],
            include: { assignees: { select: { userId: true } } },
        });

        return { tasks: tasks.map(mapTask) };
    });

    app.post('/lists/:listId/tasks', { preHandler: [requireAuth] }, async (request, reply) => {
        const listId = (request.params as { listId: string }).listId;
        const body = app.validate(createTaskSchema, request.body);

        const title = sanitizePlainText(body.title, 200);
        if (!title) throw new ValidationError({ title: ['Title is required'] });
        const description = body.description !== undefined ? sanitizeOptionalPlainText(body.description, 10_000) : null;

        const access = await getListAccessOrThrow({ listId, userId: request.user!.id, minRole: 'member' });

        const execute = async (tx: Prisma.TransactionClient) => {
            const list = await tx.list.findUnique({ where: { id: listId } });
            if (!list) throw new NotFoundError('List not found');
            assertNotArchived(list);
            assertNotArchived(access.board);

            try {
                await assertWipAllowsAdd({
                    tx,
                    listId,
                    actorRole: access.role,
                    requireOverrideReason: false,
                });
            } catch (e) {
                if (e instanceof WipLimitError) {
                    throw new ValidationError({ listId: ['WIP limit exceeded'] });
                }
                throw e;
            }

            const last = await tx.task.findFirst({
                where: { listId },
                orderBy: [{ position: 'desc' }, { id: 'desc' }],
                select: { position: true },
            });
            const position = generateBetween(last?.position ?? null, null);

            const assigneeIds = body.assigneeIds ?? [];
            await assertAssigneesBelongToProject({ tx, projectId: access.projectId, assigneeIds });

            const created = await tx.task.create({
                data: {
                    projectId: access.projectId,
                    boardId: access.board.id,
                    listId,
                    title,
                    description,
                    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                    priority: body.priority ?? undefined,
                    position,
                    createdByUserId: request.user!.id,
                    assignees: {
                        create: assigneeIds.map((userId) => ({ userId })),
                    },
                },
                include: { assignees: { select: { userId: true } } },
            });

            await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'task',
                    entityId: created.id,
                    action: 'create',
                    metadata: { listId, title: created.title },
                },
            });

            return mapTask(created);
        };

        const result = await prisma.$transaction(async (tx) => {
            if (body.idempotencyKey) {
                const idem = await withIdempotency({
                    tx,
                    userId: request.user!.id,
                    scope: 'createTask',
                    key: body.idempotencyKey,
                    execute: () => execute(tx),
                });
                return idem.result;
            }
            return execute(tx);
        });

        publish(access.projectId, 'TaskCreated', { task: result });

        reply.status(201).send(result);
    });

    app.get('/tasks/:taskId', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'viewer' });

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignees: { select: { userId: true } } },
        });
        if (!task) throw new NotFoundError('Task not found');

        return mapTask(task);
    });

    app.patch('/tasks/:taskId', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const body = app.validate(updateTaskSchema, request.body);

        const nextTitle = body.title !== undefined ? sanitizePlainText(body.title, 200) : undefined;
        if (body.title !== undefined && !nextTitle) throw new ValidationError({ title: ['Title is required'] });
        const nextDescription =
            body.description !== undefined ? sanitizeOptionalPlainText(body.description, 10_000) : undefined;

        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'member' });

        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.task.findUnique({ where: { id: taskId } });
            if (!current) throw new NotFoundError('Task not found');
            assertTaskMutable(current.status);
            assertNotArchived(access.board);

            if (body.assigneeIds) {
                await assertAssigneesBelongToProject({ tx, projectId: access.projectId, assigneeIds: body.assigneeIds });
            }

            const res = await tx.task.updateMany({
                where: { id: taskId, version: body.expectedVersion },
                data: {
                    version: { increment: 1 },
                    ...(nextTitle !== undefined ? { title: nextTitle } : {}),
                    ...(nextDescription !== undefined ? { description: nextDescription } : {}),
                    ...(body.dueDate !== undefined ? { dueDate: body.dueDate ? new Date(body.dueDate) : null } : {}),
                    ...(body.priority !== undefined ? { priority: body.priority } : {}),
                },
            });

            if (res.count !== 1) {
                const latest = await tx.task.findUnique({ where: { id: taskId } });
                throw new ConflictError({ latest, message: 'Task version conflict' });
            }

            if (body.assigneeIds) {
                await tx.taskAssignee.deleteMany({ where: { taskId } });
                if (body.assigneeIds.length) {
                    await tx.taskAssignee.createMany({
                        data: body.assigneeIds.map((userId) => ({ taskId, userId })),
                    });
                }
            }

            const task = await tx.task.findUnique({
                where: { id: taskId },
                include: { assignees: { select: { userId: true } } },
            });
            if (!task) throw new NotFoundError('Task not found');

            await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'task',
                    entityId: taskId,
                    action: 'update',
                    metadata: { fields: Object.keys(body).filter((k) => k !== 'expectedVersion') },
                },
            });

            return mapTask(task);
        });

        publish(access.projectId, 'TaskUpdated', { task: updated });

        return updated;
    });

    app.post('/tasks/:taskId/status', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const body = app.validate(updateStatusSchema, request.body);

        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'member' });

        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.task.findUnique({ where: { id: taskId } });
            if (!current) throw new NotFoundError('Task not found');

            assertStatusTransition({ from: current.status, to: body.status });

            const res = await tx.task.updateMany({
                where: { id: taskId, version: body.expectedVersion },
                data: {
                    version: { increment: 1 },
                    status: body.status,
                },
            });

            if (res.count !== 1) {
                const latest = await tx.task.findUnique({ where: { id: taskId } });
                throw new ConflictError({ latest, message: 'Task version conflict' });
            }

            const task = await tx.task.findUnique({
                where: { id: taskId },
                include: { assignees: { select: { userId: true } } },
            });
            if (!task) throw new NotFoundError('Task not found');

            await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'task',
                    entityId: taskId,
                    action: 'status_update',
                    metadata: { status: body.status },
                },
            });

            return mapTask(task);
        });

        publish(access.projectId, 'TaskStatusUpdated', { task: updated });

        return updated;
    });

    app.post('/tasks/:taskId/move', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const body = app.validate(moveTaskSchema, request.body);

        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'member' });

        const moved = await moveTaskWithRetry({
            prisma,
            taskId,
            expectedVersion: body.expectedVersion,
            toListId: body.toListId,
            beforeTaskId: body.beforeTaskId ?? null,
            afterTaskId: body.afterTaskId ?? null,
            actorId: request.user!.id,
            actorRole: access.role,
            wipOverrideReason: body.wipOverrideReason ?? null,
        });

        const toList = await prisma.list.findUnique({ where: { id: body.toListId }, select: { boardId: true } });

        publish(access.projectId, 'TaskMoved', {
            taskId,
            toListId: body.toListId,
            toBoardId: toList?.boardId ?? null,
            authoritativeOrder: moved.authoritativeOrder,
        });

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: { assignees: { select: { userId: true } } },
        });
        if (!task) throw new NotFoundError('Task not found');

        return {
            task: mapTask(task),
            authoritativeOrder: moved.authoritativeOrder,
        };
    });

    app.post('/tasks/:taskId/archive', { preHandler: [requireAuth] }, async (request) => {
        const taskId = (request.params as { taskId: string }).taskId;
        const body = app.validate(archiveSchema, request.body);

        const access = await getTaskAccessOrThrow({ taskId, userId: request.user!.id, minRole: 'member' });

        const updated = await prisma.$transaction(async (tx) => {
            const res = await tx.task.updateMany({
                where: { id: taskId, version: body.expectedVersion },
                data: { version: { increment: 1 }, status: 'archived' },
            });

            if (res.count !== 1) {
                const latest = await tx.task.findUnique({ where: { id: taskId } });
                throw new ConflictError({ latest, message: 'Task version conflict' });
            }

            const task = await tx.task.findUnique({
                where: { id: taskId },
                include: { assignees: { select: { userId: true } } },
            });
            if (!task) throw new NotFoundError('Task not found');

            await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'task',
                    entityId: taskId,
                    action: 'archive',
                    metadata: {},
                },
            });

            return mapTask(task);
        });

        publish(access.projectId, 'TaskArchived', { task: updated });

        return updated;
    });
};

export default tasksRoutes;
