import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { ValidationError } from '../httpErrors.js';
import { getBoardAccessOrThrow, getListAccessOrThrow } from '../../domain/rbac/projectAccess.js';
import { appendActivity } from '../../domain/activity/activityService.js';
import { publish } from '../../realtime/publish.js';
import { assertNotArchived } from '../../domain/guards/archiveGuards.js';
import { sqliteRetry } from '../../db/sqliteRetry.js';

const createListSchema = z.object({
    title: z.string().min(1),
});

const reorderListsSchema = z.object({
    orderedListIds: z.array(z.string().uuid()).min(1),
});

const updateWipSchema = z
    .object({
        isWipLimited: z.boolean(),
        wipLimit: z.number().int().positive().optional(),
    })
    .refine((v) => !v.isWipLimited || (v.wipLimit !== undefined && v.wipLimit > 0), {
        message: 'wipLimit is required when isWipLimited=true',
        path: ['wipLimit'],
    });

export const listsRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        '/boards/:boardId/lists',
        { preHandler: [requireAuth] },
        async (request) => {
            const boardId = (request.params as { boardId: string }).boardId;
            const { board } = await getBoardAccessOrThrow({
                userId: request.user!.id,
                boardId,
                minRole: 'viewer',
            });

            const lists = await prisma.list.findMany({
                where: { boardId },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
            });

            return { projectId: board.projectId, boardId, lists };
        },
    );

    app.post(
        '/boards/:boardId/lists',
        { preHandler: [requireAuth] },
        async (request, reply) => {
            const boardId = (request.params as { boardId: string }).boardId;
            const body = app.validate(createListSchema, request.body);
            const { board } = await getBoardAccessOrThrow({
                userId: request.user!.id,
                boardId,
                minRole: 'admin',
            });

            assertNotArchived(board);

            const max = await prisma.list.aggregate({
                where: { boardId },
                _max: { order: true },
            });

            const list = await prisma.list.create({
                data: {
                    boardId,
                    title: body.title,
                    order: (max._max.order ?? 0) + 1,
                },
            });

            await appendActivity({
                projectId: board.projectId,
                actorId: request.user!.id,
                entityType: 'list',
                entityId: list.id,
                action: 'create',
                metadata: { title: list.title, boardId },
            });

            reply.status(201).send(list);
        },
    );

    app.post(
        '/boards/:boardId/lists/reorder',
        { preHandler: [requireAuth] },
        async (request) => {
            const boardId = (request.params as { boardId: string }).boardId;
            const body = app.validate(reorderListsSchema, request.body);

            const { projectId, board } = await getBoardAccessOrThrow({
                userId: request.user!.id,
                boardId,
                minRole: 'admin',
            });

            assertNotArchived(board);

            const lists = await prisma.list.findMany({ where: { boardId }, select: { id: true } });
            const existingIds = new Set(lists.map((l) => l.id));

            if (body.orderedListIds.length !== lists.length) {
                throw new ValidationError({ orderedListIds: ['orderedListIds must include all lists'] });
            }
            for (const id of body.orderedListIds) {
                if (!existingIds.has(id)) {
                    throw new ValidationError({ orderedListIds: ['orderedListIds contains invalid list id'] });
                }
            }

            await sqliteRetry(() =>
                prisma.$transaction(async (tx) => {
                    for (let i = 0; i < body.orderedListIds.length; i++) {
                        await tx.list.update({
                            where: { id: body.orderedListIds[i] },
                            data: { order: i + 1, version: { increment: 1 } },
                        });
                    }

                    await tx.activityLog.create({
                        data: {
                            projectId,
                            actorId: request.user!.id,
                            entityType: 'board',
                            entityId: boardId,
                            action: 'lists_reorder',
                            metadata: { orderedListIds: body.orderedListIds },
                        },
                    });
                }),
            );

            const updated = await prisma.list.findMany({
                where: { boardId },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
            });

            publish(projectId, 'ListReordered', { boardId, orderedListIds: body.orderedListIds });

            return { lists: updated };
        },
    );

    app.patch(
        '/lists/:listId/wip',
        { preHandler: [requireAuth] },
        async (request) => {
            const listId = (request.params as { listId: string }).listId;
            const body = app.validate(updateWipSchema, request.body);

            const access = await getListAccessOrThrow({ listId, userId: request.user!.id, minRole: 'admin' });

            assertNotArchived(access.board);
            assertNotArchived(access.list);

            const list = await prisma.list.update({
                where: { id: listId },
                data: {
                    version: { increment: 1 },
                    isWipLimited: body.isWipLimited,
                    wipLimit: body.isWipLimited ? body.wipLimit! : null,
                },
            });

            await appendActivity({
                projectId: access.projectId,
                actorId: request.user!.id,
                entityType: 'list',
                entityId: listId,
                action: 'wip_update',
                metadata: { isWipLimited: list.isWipLimited, wipLimit: list.wipLimit },
            });

            publish(access.projectId, 'ListWipUpdated', {
                listId,
                isWipLimited: list.isWipLimited,
                wipLimit: list.wipLimit,
            });

            return list;
        },
    );

    app.post('/lists/:listId/archive', { preHandler: [requireAuth] }, async (request) => {
        const listId = (request.params as { listId: string }).listId;
        const access = await getListAccessOrThrow({ listId, userId: request.user!.id, minRole: 'admin' });

        assertNotArchived(access.board);
        assertNotArchived(access.list);

        const res = await prisma.$transaction(async (tx) => {
            await tx.list.update({ where: { id: listId }, data: { status: 'archived', version: { increment: 1 } } });
            await tx.task.updateMany({
                where: { listId, status: { not: 'archived' } },
                data: { status: 'archived', version: { increment: 1 } },
            });

            const activity = await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'list',
                    entityId: listId,
                    action: 'archive',
                    metadata: {},
                },
            });

            const updated = await tx.list.findUnique({ where: { id: listId } });
            return { list: updated, activity };
        });

        publish(access.projectId, 'ListArchived', { listId });
        publish(access.projectId, 'ActivityAppended', {
            event: {
                id: res.activity.id,
                projectId: res.activity.projectId,
                actorId: res.activity.actorId,
                entityType: res.activity.entityType,
                entityId: res.activity.entityId,
                action: res.activity.action,
                timestamp: res.activity.timestamp.toISOString(),
                metadata: (res.activity.metadata ?? {}) as Record<string, unknown>,
            },
        });

        return res.list;
    });
};

export default listsRoutes;
