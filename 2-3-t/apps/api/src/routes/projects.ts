import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { appendActivity } from '../domain/activity/activity-service';

export const projectsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/projects', { preHandler: requireAuth }, async (req) => {
    const userId = req.user!.id;

    const [projects, invitations] = await Promise.all([
      app.prisma.project.findMany({
        where: {
          memberships: {
            some: { userId },
          },
        },
        orderBy: {
          updatedAt: 'desc',
        },
      }),
      app.prisma.projectInvitation.findMany({
        where: {
          email: req.user!.email,
          status: 'pending',
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      projects,
      invitations,
    };
  });

  const zCreateProject = z.object({
    name: z.string().min(1).max(200),
    description: z.string().max(2000).nullable().optional(),
  });

  app.post('/projects', { preHandler: requireAuth }, async (req, reply) => {
    const input = zCreateProject.parse(req.body);
    const userId = req.user!.id;

    const project = await withTransaction(app.prisma, async (tx) => {
      const created = await tx.project.create({
        data: {
          name: input.name,
          description: input.description ?? null,
          ownerId: userId,
          visibility: 'private',
          status: 'active',
        },
      });

      await tx.projectMembership.create({
        data: {
          projectId: created.id,
          userId,
          role: 'owner',
        },
      });

      await appendActivity(tx, {
        projectId: created.id,
        actorId: userId,
        entityType: 'project',
        entityId: created.id,
        action: 'project.created',
        metadata: { name: created.name },
      });

      return created;
    });

    reply.status(201).send(project);
  });

  const zUpdateProject = z.object({
    version: z.number().int().min(0),
    name: z.string().min(1).max(200).nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    visibility: z.enum(['private', 'shared']).nullable().optional(),
  });

  app.patch(
    '/projects/:projectId',
    {
      preHandler: [requireAuth, projectScopeWithPermission('project:write')],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const input = zUpdateProject.parse(req.body);

      const result = await app.prisma.project.updateMany({
        where: { id: projectId, version: input.version },
        data: {
          version: { increment: 1 },
          ...(input.name !== undefined ? { name: input.name ?? undefined } : {}),
          ...(input.description !== undefined ? { description: input.description ?? null } : {}),
          ...(input.visibility !== undefined ? { visibility: input.visibility ?? undefined } : {}),
        },
      });

      if (result.count === 0) {
        throw new HttpError(409, 'VERSION_CONFLICT', 'Version conflict');
      }

      const updated = await app.prisma.project.findUnique({ where: { id: projectId } });
      if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Not found');
      return updated;
    }
  );

  const zArchive = z.object({
    version: z.number().int().min(0),
    reason: z.string().max(2000).nullable().optional(),
  });

  app.post(
    '/projects/:projectId/archive',
    {
      preHandler: [requireAuth, projectScopeWithPermission('project:write')],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const input = zArchive.parse(req.body);

      const result = await app.prisma.project.updateMany({
        where: { id: projectId, version: input.version },
        data: {
          status: 'archived',
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new HttpError(409, 'VERSION_CONFLICT', 'Version conflict');
      }

      const updated = await app.prisma.project.findUnique({ where: { id: projectId } });
      if (!updated) throw new HttpError(404, 'NOT_FOUND', 'Not found');
      return updated;
    }
  );
};
