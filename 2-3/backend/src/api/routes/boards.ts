import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { ValidationError } from '../httpErrors.js';
import { appendActivity } from '../../domain/activity/activityService.js';
import { publish } from '../../realtime/publish.js';
import { getBoardAccessOrThrow } from '../../domain/rbac/projectAccess.js';
import { assertNotArchived } from '../../domain/guards/archiveGuards.js';
import { sqliteRetry } from '../../db/sqliteRetry.js';

const createBoardSchema = z.object({
    name: z.string().min(1),
});

const reorderBoardsSchema = z.object({
    orderedBoardIds: z.array(z.string().uuid()).min(1),
});

export const boardsRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        '/projects/:projectId/boards',
        { preHandler: [requireAuth, requireProjectRole('viewer')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const boards = await prisma.board.findMany({
                where: { projectId },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
            });
            return { boards };
        },
    );

    app.post(
        '/projects/:projectId/boards',
        { preHandler: [requireAuth, requireProjectRole('admin')] },
        async (request, reply) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const body = app.validate(createBoardSchema, request.body);

            const project = await prisma.project.findUnique({ where: { id: projectId }, select: { status: true } });
            assertNotArchived(project);

            const max = await prisma.board.aggregate({
                where: { projectId },
                _max: { order: true },
            });

            const board = await prisma.board.create({
                data: {
                    projectId,
                    name: body.name,
                    order: (max._max.order ?? 0) + 1,
                },
            });

            await appendActivity({
                projectId,
                actorId: request.user!.id,
                entityType: 'board',
                entityId: board.id,
                action: 'create',
                metadata: { name: board.name },
            });

            reply.status(201).send(board);
        },
    );

    app.post(
        '/projects/:projectId/boards/reorder',
        { preHandler: [requireAuth, requireProjectRole('admin')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const body = app.validate(reorderBoardsSchema, request.body);

            const project = await prisma.project.findUnique({ where: { id: projectId }, select: { status: true } });
            assertNotArchived(project);

            const boards = await prisma.board.findMany({ where: { projectId }, select: { id: true } });
            const existingIds = new Set(boards.map((b) => b.id));

            if (body.orderedBoardIds.length !== boards.length) {
                throw new ValidationError({ orderedBoardIds: ['orderedBoardIds must include all boards'] });
            }
            for (const id of body.orderedBoardIds) {
                if (!existingIds.has(id)) {
                    throw new ValidationError({ orderedBoardIds: ['orderedBoardIds contains invalid board id'] });
                }
            }

            await sqliteRetry(() =>
                prisma.$transaction(async (tx) => {
                    for (let i = 0; i < body.orderedBoardIds.length; i++) {
                        await tx.board.update({
                            where: { id: body.orderedBoardIds[i] },
                            data: { order: i + 1, version: { increment: 1 } },
                        });
                    }

                    await tx.activityLog.create({
                        data: {
                            projectId,
                            actorId: request.user!.id,
                            entityType: 'project',
                            entityId: projectId,
                            action: 'boards_reorder',
                            metadata: { orderedBoardIds: body.orderedBoardIds },
                        },
                    });
                }),
            );

            const updated = await prisma.board.findMany({
                where: { projectId },
                orderBy: [{ order: 'asc' }, { id: 'asc' }],
            });

            publish(projectId, 'BoardReordered', { orderedBoardIds: body.orderedBoardIds });

            return { boards: updated };
        },
    );

    app.post('/boards/:boardId/archive', { preHandler: [requireAuth] }, async (request) => {
        const boardId = (request.params as { boardId: string }).boardId;
        const access = await getBoardAccessOrThrow({ boardId, userId: request.user!.id, minRole: 'admin' });
        assertNotArchived(access.board);

        const res = await prisma.$transaction(async (tx) => {
            await tx.board.update({ where: { id: boardId }, data: { status: 'archived', version: { increment: 1 } } });
            await tx.list.updateMany({
                where: { boardId, status: { not: 'archived' } },
                data: { status: 'archived', version: { increment: 1 } },
            });
            await tx.task.updateMany({
                where: { boardId, status: { not: 'archived' } },
                data: { status: 'archived', version: { increment: 1 } },
            });

            const activity = await tx.activityLog.create({
                data: {
                    projectId: access.projectId,
                    actorId: request.user!.id,
                    entityType: 'board',
                    entityId: boardId,
                    action: 'archive',
                    metadata: {},
                },
            });

            const updated = await tx.board.findUnique({ where: { id: boardId } });
            return { board: updated, activity };
        });

        publish(access.projectId, 'BoardArchived', { boardId });
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

        return res.board;
    });
};

export default boardsRoutes;
