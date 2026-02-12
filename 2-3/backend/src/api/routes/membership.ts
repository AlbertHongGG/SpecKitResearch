import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { prisma } from '../../db/prisma.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../httpErrors.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireProjectRole } from '../middleware/requireProjectRole.js';
import { appendActivity } from '../../domain/activity/activityService.js';

const createInvitationSchema = z.object({
    email: z.string().email(),
    invitedRole: z.enum(['admin', 'member', 'viewer']),
});

const updateMemberRoleSchema = z.object({
    userId: z.string().uuid(),
    role: z.enum(['owner', 'admin', 'member', 'viewer']),
});

export const membershipRoutes: FastifyPluginAsync = async (app) => {
    app.get(
        '/projects/:projectId/invitations',
        { preHandler: [requireAuth, requireProjectRole('admin')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;

            const invitations = await prisma.projectInvitation.findMany({
                where: { projectId },
                orderBy: [{ createdAt: 'desc' }],
            });

            return {
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
        },
    );

    app.post(
        '/projects/:projectId/invitations',
        { preHandler: [requireAuth, requireProjectRole('admin')] },
        async (request, reply) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const body = app.validate(createInvitationSchema, request.body);

            const email = body.email.trim().toLowerCase();

            const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
            if (existingUser) {
                const existingMembership = await prisma.projectMembership.findUnique({
                    where: { projectId_userId: { projectId, userId: existingUser.id } },
                });
                if (existingMembership) {
                    throw new ValidationError({ email: ['User is already a member of this project'] });
                }
            }

            const duplicatePending = await prisma.projectInvitation.findFirst({
                where: { projectId, email, status: 'pending' },
            });
            if (duplicatePending) {
                throw new ValidationError({ email: ['An invitation is already pending for this email'] });
            }

            const invitation = await prisma.projectInvitation.create({
                data: {
                    projectId,
                    email,
                    invitedRole: body.invitedRole,
                    invitedByUserId: request.user!.id,
                },
            });

            await appendActivity({
                projectId,
                actorId: request.user!.id,
                entityType: 'invitation',
                entityId: invitation.id,
                action: 'create',
                metadata: { email, invitedRole: invitation.invitedRole },
            });

            reply.status(201).send({
                id: invitation.id,
                projectId: invitation.projectId,
                email: invitation.email,
                invitedRole: invitation.invitedRole,
                status: invitation.status,
                createdAt: invitation.createdAt.toISOString(),
                respondedAt: invitation.respondedAt?.toISOString() ?? null,
            });
        },
    );

    app.post('/invitations/:invitationId/accept', { preHandler: [requireAuth] }, async (request) => {
        const invitationId = (request.params as { invitationId: string }).invitationId;

        const invitation = await prisma.projectInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation) throw new NotFoundError('Invitation not found');

        const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { email: true } });
        if (!user) throw new NotFoundError('User not found');

        if (user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
            throw new ForbiddenError('Invitation email does not match current user');
        }

        if (invitation.status !== 'pending') {
            return {
                id: invitation.id,
                projectId: invitation.projectId,
                email: invitation.email,
                invitedRole: invitation.invitedRole,
                status: invitation.status,
                createdAt: invitation.createdAt.toISOString(),
                respondedAt: invitation.respondedAt?.toISOString() ?? null,
            };
        }

        const updated = await prisma.$transaction(async (tx) => {
            await tx.projectMembership.upsert({
                where: { projectId_userId: { projectId: invitation.projectId, userId: request.user!.id } },
                update: { role: invitation.invitedRole, version: { increment: 1 } },
                create: {
                    projectId: invitation.projectId,
                    userId: request.user!.id,
                    role: invitation.invitedRole,
                },
            });

            const inv = await tx.projectInvitation.update({
                where: { id: invitation.id },
                data: { status: 'accepted', respondedAt: new Date() },
            });

            await tx.activityLog.create({
                data: {
                    projectId: invitation.projectId,
                    actorId: request.user!.id,
                    entityType: 'invitation',
                    entityId: invitation.id,
                    action: 'accept',
                    metadata: { invitedRole: invitation.invitedRole },
                },
            });

            return inv;
        });

        return {
            id: updated.id,
            projectId: updated.projectId,
            email: updated.email,
            invitedRole: updated.invitedRole,
            status: updated.status,
            createdAt: updated.createdAt.toISOString(),
            respondedAt: updated.respondedAt?.toISOString() ?? null,
        };
    });

    app.post('/invitations/:invitationId/reject', { preHandler: [requireAuth] }, async (request) => {
        const invitationId = (request.params as { invitationId: string }).invitationId;

        const invitation = await prisma.projectInvitation.findUnique({ where: { id: invitationId } });
        if (!invitation) throw new NotFoundError('Invitation not found');

        const user = await prisma.user.findUnique({ where: { id: request.user!.id }, select: { email: true } });
        if (!user) throw new NotFoundError('User not found');

        if (user.email.trim().toLowerCase() !== invitation.email.trim().toLowerCase()) {
            throw new ForbiddenError('Invitation email does not match current user');
        }

        if (invitation.status !== 'pending') {
            return {
                id: invitation.id,
                projectId: invitation.projectId,
                email: invitation.email,
                invitedRole: invitation.invitedRole,
                status: invitation.status,
                createdAt: invitation.createdAt.toISOString(),
                respondedAt: invitation.respondedAt?.toISOString() ?? null,
            };
        }

        const updated = await prisma.$transaction(async (tx) => {
            const inv = await tx.projectInvitation.update({
                where: { id: invitation.id },
                data: { status: 'rejected', respondedAt: new Date() },
            });

            await tx.activityLog.create({
                data: {
                    projectId: invitation.projectId,
                    actorId: request.user!.id,
                    entityType: 'invitation',
                    entityId: invitation.id,
                    action: 'reject',
                    metadata: { invitedRole: invitation.invitedRole },
                },
            });

            return inv;
        });

        return {
            id: updated.id,
            projectId: updated.projectId,
            email: updated.email,
            invitedRole: updated.invitedRole,
            status: updated.status,
            createdAt: updated.createdAt.toISOString(),
            respondedAt: updated.respondedAt?.toISOString() ?? null,
        };
    });

    app.get(
        '/projects/:projectId/members',
        { preHandler: [requireAuth, requireProjectRole('viewer')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;

            const members = await prisma.projectMembership.findMany({
                where: { projectId },
                orderBy: [{ joinedAt: 'asc' }],
            });

            return {
                members: members.map((m) => ({
                    projectId: m.projectId,
                    userId: m.userId,
                    version: m.version,
                    role: m.role,
                    joinedAt: m.joinedAt.toISOString(),
                })),
            };
        },
    );

    app.patch(
        '/projects/:projectId/members',
        { preHandler: [requireAuth, requireProjectRole('admin')] },
        async (request) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const body = app.validate(updateMemberRoleSchema, request.body);

            const actorRole = request.projectAccess!.role;
            if (body.role === 'owner' && actorRole !== 'owner') {
                throw new ForbiddenError('Only owner can transfer ownership');
            }

            const membership = await prisma.projectMembership.findUnique({
                where: { projectId_userId: { projectId, userId: body.userId } },
            });
            if (!membership) throw new NotFoundError('Member not found');

            if (membership.role === 'owner' && actorRole !== 'owner') {
                throw new ForbiddenError('Only owner can change owner role');
            }

            const updated = await prisma.projectMembership.update({
                where: { projectId_userId: { projectId, userId: body.userId } },
                data: { role: body.role, version: { increment: 1 } },
            });

            await appendActivity({
                projectId,
                actorId: request.user!.id,
                entityType: 'membership',
                entityId: `${projectId}:${updated.userId}`,
                action: 'role_update',
                metadata: { userId: updated.userId, role: updated.role },
            });

            return {
                projectId: updated.projectId,
                userId: updated.userId,
                version: updated.version,
                role: updated.role,
                joinedAt: updated.joinedAt.toISOString(),
            };
        },
    );

    app.delete(
        '/projects/:projectId/members',
        { preHandler: [requireAuth, requireProjectRole('owner')] },
        async (request, reply) => {
            const projectId = (request.params as { projectId: string }).projectId;
            const userId = (request.query as { userId?: string }).userId;
            if (!userId) throw new ValidationError({ userId: ['userId is required'] });

            if (userId === request.user!.id) {
                throw new ValidationError({ userId: ['Owner cannot remove themselves'] });
            }

            const membership = await prisma.projectMembership.findUnique({
                where: { projectId_userId: { projectId, userId } },
            });
            if (!membership) throw new NotFoundError('Member not found');

            await prisma.$transaction(async (tx) => {
                await tx.taskAssignee.deleteMany({
                    where: { userId, task: { projectId } },
                });

                await tx.projectMembership.delete({
                    where: { projectId_userId: { projectId, userId } },
                });

                await tx.activityLog.create({
                    data: {
                        projectId,
                        actorId: request.user!.id,
                        entityType: 'membership',
                        entityId: `${projectId}:${userId}`,
                        action: 'remove',
                        metadata: { userId },
                    },
                });
            });

            reply.send({ success: true });
        },
    );
};

export default membershipRoutes;
