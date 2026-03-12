import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { appendActivity } from '../domain/activity/activity-service';

const zUpdateMembership = z.object({
  version: z.number().int().min(0),
  role: z.enum(['admin', 'member', 'viewer']),
});

export const membershipsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/projects/:projectId/memberships',
    {
      preHandler: [requireAuth, projectScopeWithPermission('project:read')],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const memberships = await app.prisma.projectMembership.findMany({
        where: { projectId },
        orderBy: { joinedAt: 'asc' },
      });
      return { memberships };
    }
  );

  app.patch(
    '/projects/:projectId/memberships/:membershipId',
    {
      preHandler: [requireAuth, projectScopeWithPermission('membership:write')],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const membershipId = (req.params as any).membershipId as string;
      const input = zUpdateMembership.parse(req.body);

      const existing = await app.prisma.projectMembership.findUnique({ where: { id: membershipId } });
      if (!existing || existing.projectId !== projectId) {
        throw new HttpError(404, 'NOT_FOUND', 'Not found');
      }

      if (existing.role === 'owner') {
        throw new HttpError(409, 'CONFLICT', 'Cannot change owner role');
      }

      const result = await app.prisma.projectMembership.updateMany({
        where: { id: membershipId, projectId, version: input.version },
        data: { role: input.role, version: { increment: 1 } },
      });

      if (result.count === 0) {
        throw new HttpError(409, 'VERSION_CONFLICT', 'Version conflict');
      }

      const updated = await app.prisma.projectMembership.findUnique({ where: { id: membershipId } });
      if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Not found');
      return updated;
    }
  );

  app.delete(
    '/projects/:projectId/memberships/:membershipId',
    {
      preHandler: [requireAuth, projectScopeWithPermission('membership:write')],
    },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const membershipId = (req.params as any).membershipId as string;

      const existing = await app.prisma.projectMembership.findUnique({ where: { id: membershipId } });
      if (!existing || existing.projectId !== projectId) {
        throw new HttpError(404, 'NOT_FOUND', 'Not found');
      }

      if (existing.role === 'owner') {
        throw new HttpError(409, 'CONFLICT', 'Cannot remove owner');
      }

      await withTransaction(app.prisma, async (tx) => {
        await tx.taskAssignee.deleteMany({
          where: {
            userId: existing.userId,
            task: {
              projectId,
            },
          },
        });

        await tx.projectMembership.delete({ where: { id: membershipId } });

        await appendActivity(tx, {
          projectId,
          actorId: req.user!.id,
          entityType: 'membership',
          entityId: membershipId,
          action: 'membership.removed',
          metadata: { removedUserId: existing.userId, role: existing.role },
        });
      });

      reply.status(204).send();
    }
  );
};
