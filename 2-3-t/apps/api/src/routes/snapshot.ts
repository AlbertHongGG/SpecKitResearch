import type { FastifyPluginAsync } from 'fastify';
import { ERROR_CODES } from '@trello-lite/shared';
import { requireAuth } from '../http/auth/require-auth';
import { projectScope } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';

export const snapshotRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    '/projects/:projectId/snapshot',
    {
      preHandler: [requireAuth, projectScope],
    },
    async (req) => {
      const projectId = (req.params as any).projectId as string;

      const [project, boards, lists, tasks, memberships] = await Promise.all([
        app.prisma.project.findUnique({ where: { id: projectId } }),
        app.prisma.board.findMany({ where: { projectId }, orderBy: { order: 'asc' } }),
        app.prisma.list.findMany({
          where: { board: { projectId } },
          orderBy: [{ board: { order: 'asc' } }, { order: 'asc' }],
        }),
        app.prisma.task.findMany({
          where: { projectId },
          include: { assignees: true },
          orderBy: [{ listId: 'asc' }, { position: 'asc' }, { id: 'asc' }],
        }),
        app.prisma.projectMembership.findMany({
          where: { projectId },
          orderBy: { joinedAt: 'asc' },
        }),
      ]);

      if (!project) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');

      return {
        project,
        boards,
        lists,
        tasks,
        memberships,
      };
    }
  );
};
