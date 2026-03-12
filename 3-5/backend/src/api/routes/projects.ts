import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { ConflictError, NotFoundError } from '../httpErrors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { appendActivity } from '../../domain/activity/activityService.js';
import { publish } from '../../realtime/publish.js';

const createProjectSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    visibility: z.enum(['private', 'shared']).optional(),
});

const updateProjectSchema = z.object({
    expectedVersion: z.number().int().positive(),
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    visibility: z.enum(['private', 'shared']).optional(),
});

export const projectsRoutes: FastifyPluginAsync = async (app) => {
    app.get('/projects', { preHandler: [requireAuth] }, async (request) => {
        const userId = request.user!.id;
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });

        const memberships = await prisma.projectMembership.findMany({
            where: { userId },
            include: { project: true },
            orderBy: [{ joinedAt: 'desc' }],
        });

        const invitations = user?.email
            ? await prisma.projectInvitation.findMany({
                where: { email: user.email, status: 'pending' },
                orderBy: [{ createdAt: 'desc' }],
            })
            : [];

        return {
            projects: memberships.map((m) => ({ project: m.project, role: m.role })),
            invitations: invitations.map((i) => ({
                id: i.id,
                projectId: i.projectId,
                email: i.email,
                invitedRole: i.invitedRole,
                status: i.status,
                createdAt: i.createdAt.toISOString(),
                respondedAt: i.respondedAt?.toISOString() ?? null,
            })),
        };
    });

    app.post('/projects', { preHandler: [requireAuth] }, async (request, reply) => {
        const body = app.validate(createProjectSchema, request.body);
        const userId = request.user!.id;

        const project = await prisma.$transaction(async (tx) => {
            const created = await tx.project.create({
                data: {
                    name: body.name,
                    description: body.description,
                    ownerId: userId,
                    visibility: body.visibility ?? 'private',
                },
            });

            await tx.projectMembership.create({
                data: { projectId: created.id, userId, role: 'owner' },
            });

            await tx.activityLog.create({
                data: {
                    projectId: created.id,
                    actorId: userId,
                    entityType: 'project',
                    entityId: created.id,
                    action: 'create',
                    metadata: { name: created.name },
                },
            });

            return created;
        });

        reply.status(201).send(project);
    });

    app.get('/projects/:projectId', { preHandler: [requireAuth, requireProjectRole('viewer')] }, async (request) => {
        const projectId = (request.params as { projectId: string }).projectId;
        const project = await prisma.project.findUnique({ where: { id: projectId } });
        if (!project) throw new NotFoundError('Project not found');
        return project;
    });

    app.patch(
        '/projects/:projectId',
        { preHandler: [requireAuth, requireProjectRole('owner')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const body = app.validate(updateProjectSchema, request.body);

            const updated = await prisma.project.updateMany({
                where: { id: projectId, version: body.expectedVersion },
                data: {
                    version: { increment: 1 },
                    ...(body.name ? { name: body.name } : {}),
                    ...(body.description !== undefined ? { description: body.description } : {}),
                    ...(body.visibility ? { visibility: body.visibility } : {}),
                },
            });

            if (updated.count !== 1) {
                const latest = await prisma.project.findUnique({ where: { id: projectId } });
                throw new ConflictError({ latest, message: 'Project version conflict' });
            }

            const project = await prisma.project.findUnique({ where: { id: projectId } });
            if (!project) throw new NotFoundError('Project not found');

            await appendActivity({
                projectId,
                actorId: request.user!.id,
                entityType: 'project',
                entityId: projectId,
                action: 'update',
                metadata: { fields: Object.keys(body).filter((k) => k !== 'expectedVersion') },
            });

            return project;
        },
    );

    app.post(
        '/projects/:projectId/archive',
        { preHandler: [requireAuth, requireProjectRole('owner')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;

            const res = await prisma.$transaction(async (tx) => {
                const project = await tx.project.findUnique({ where: { id: projectId } });
                if (!project) throw new NotFoundError('Project not found');

                let activity: {
                    id: string;
                    projectId: string;
                    actorId: string;
                    entityType: string;
                    entityId: string;
                    action: string;
                    timestamp: Date;
                    metadata: unknown;
                } | null = null;

                if (project.status !== 'archived') {
                    await tx.project.update({
                        where: { id: projectId },
                        data: { status: 'archived', version: { increment: 1 } },
                    });

                    const boards = await tx.board.findMany({ where: { projectId }, select: { id: true } });
                    const boardIds = boards.map((b) => b.id);

                    if (boardIds.length) {
                        await tx.board.updateMany({
                            where: { id: { in: boardIds }, status: { not: 'archived' } },
                            data: { status: 'archived', version: { increment: 1 } },
                        });

                        await tx.list.updateMany({
                            where: { boardId: { in: boardIds }, status: { not: 'archived' } },
                            data: { status: 'archived', version: { increment: 1 } },
                        });
                    }

                    await tx.task.updateMany({
                        where: { projectId, status: { not: 'archived' } },
                        data: { status: 'archived', version: { increment: 1 } },
                    });

                    activity = await tx.activityLog.create({
                        data: {
                            projectId,
                            actorId: request.user!.id,
                            entityType: 'project',
                            entityId: projectId,
                            action: 'archive',
                            metadata: {},
                        },
                    });
                }

                const updated = await tx.project.findUnique({ where: { id: projectId } });
                if (!updated) throw new NotFoundError('Project not found');
                return { project: updated, activity };
            });

            publish(projectId, 'ProjectArchived', { projectId });
            if (res.activity) {
                publish(projectId, 'ActivityAppended', {
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
            }

            return res.project;
        },
    );
};

export default projectsRoutes;
