import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { findUserByEmail } from '../repos/user-repo';

const zCreateInvitation = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'member', 'viewer']),
});

export const invitationsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/projects/:projectId/invitations',
    {
      preHandler: [requireAuth, projectScopeWithPermission('membership:write')],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const invitations = await app.prisma.projectInvitation.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
      });
      return { invitations };
    }
  );

  app.post(
    '/projects/:projectId/invitations',
    {
      preHandler: [requireAuth, projectScopeWithPermission('membership:write')],
    },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const input = zCreateInvitation.parse(req.body);

      const existingPending = await app.prisma.projectInvitation.findFirst({
        where: { projectId, email: input.email, status: 'pending' },
      });
      if (existingPending) {
        throw new HttpError(409, 'CONFLICT', 'Invitation already exists');
      }

      const user = await findUserByEmail(app.prisma, input.email);
      if (user) {
        const membership = await app.prisma.projectMembership.findUnique({
          where: { projectId_userId: { projectId, userId: user.id } },
        });
        if (membership) {
          throw new HttpError(409, 'CONFLICT', 'User is already a member');
        }
      }

      const invitation = await app.prisma.projectInvitation.create({
        data: {
          projectId,
          email: input.email,
          invitedRole: input.role,
          invitedById: req.user!.id,
          status: 'pending',
        },
      });

      reply.status(201).send(invitation);
    }
  );

  app.post('/invitations/:invitationId/accept', { preHandler: requireAuth }, async (req) => {
    const invitationId = (req.params as any).invitationId as string;
    const invitation = await app.prisma.projectInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new HttpError(404, 'NOT_FOUND', 'Not found');

    if (invitation.email !== req.user!.email) {
      throw new HttpError(403, 'FORBIDDEN', 'Forbidden');
    }

    if (invitation.status !== 'pending') {
      throw new HttpError(409, 'CONFLICT', 'Invitation is not pending');
    }

    const membership = await withTransaction(app.prisma, async (tx) => {
      const existing = await tx.projectMembership.findUnique({
        where: { projectId_userId: { projectId: invitation.projectId, userId: req.user!.id } },
      });
      if (existing) {
        throw new HttpError(409, 'CONFLICT', 'Already a member');
      }

      await tx.projectInvitation.update({
        where: { id: invitationId },
        data: { status: 'accepted', respondedAt: new Date() },
      });

      return tx.projectMembership.create({
        data: {
          projectId: invitation.projectId,
          userId: req.user!.id,
          role: invitation.invitedRole,
        },
      });
    });

    return membership;
  });

  app.post('/invitations/:invitationId/reject', { preHandler: requireAuth }, async (req, reply) => {
    const invitationId = (req.params as any).invitationId as string;
    const invitation = await app.prisma.projectInvitation.findUnique({ where: { id: invitationId } });
    if (!invitation) throw new HttpError(404, 'NOT_FOUND', 'Not found');

    if (invitation.email !== req.user!.email) {
      throw new HttpError(403, 'FORBIDDEN', 'Forbidden');
    }

    if (invitation.status !== 'pending') {
      throw new HttpError(409, 'CONFLICT', 'Invitation is not pending');
    }

    await app.prisma.projectInvitation.update({
      where: { id: invitationId },
      data: { status: 'rejected', respondedAt: new Date() },
    });

    reply.status(204).send();
  });
};
