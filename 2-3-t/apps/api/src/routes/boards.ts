import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ERROR_CODES } from '@trello-lite/shared';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { appendActivity } from '../domain/activity/activity-service';
import { assertWritableScope } from '../domain/archived/archived';
import { archiveBoardOcc, createBoard, findBoardInProject, updateBoardOcc } from '../repos/board-repo';

export const boardsRoutes: FastifyPluginAsync = async (app) => {
  const zCreateBoard = z.object({
    name: z.string().min(1).max(200),
  });

  app.post(
    '/projects/:projectId/boards',
    { preHandler: [requireAuth, projectScopeWithPermission('board:write')] },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const input = zCreateBoard.parse(req.body);

      assertWritableScope({ projectStatus: req.project!.status });

      const board = await withTransaction(app.prisma, async (tx) => {
        const created = await createBoard(tx as any, projectId, input.name);
        await appendActivity(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'board',
          entityId: created.id,
          action: 'board.created',
          metadata: { name: created.name },
        });
        return created;
      });

      reply.status(201).send(board);
    }
  );

  const zUpdateBoard = z.object({
    version: z.number().int().min(0),
    name: z.string().min(1).max(200).nullable().optional(),
  });

  app.patch(
    '/projects/:projectId/boards/:boardId',
    { preHandler: [requireAuth, projectScopeWithPermission('board:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const boardId = (req.params as any).boardId as string;
      const input = zUpdateBoard.parse(req.body);

      const existing = await findBoardInProject(app.prisma, projectId, boardId);
      if (!existing) {
        throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      }

      assertWritableScope({ projectStatus: req.project!.status, boardStatus: existing.status });

      const count = await updateBoardOcc(app.prisma, projectId, boardId, input.version, {
        ...(input.name !== undefined ? { name: input.name ?? undefined } : {}),
      });
      if (count === 0) {
        throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      }

      const updated = await findBoardInProject(app.prisma, projectId, boardId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );

  const zArchiveBoard = z.object({
    version: z.number().int().min(0),
    reason: z.string().max(2000).nullable().optional(),
  });

  app.post(
    '/projects/:projectId/boards/:boardId/archive',
    { preHandler: [requireAuth, projectScopeWithPermission('board:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const boardId = (req.params as any).boardId as string;
      const input = zArchiveBoard.parse(req.body);

      const existing = await findBoardInProject(app.prisma, projectId, boardId);
      if (!existing) {
        throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      }

      assertWritableScope({ projectStatus: req.project!.status, boardStatus: existing.status });

      const count = await withTransaction(app.prisma, async (tx) => {
        const updatedCount = await archiveBoardOcc(tx as any, projectId, boardId, input.version);
        if (updatedCount === 1) {
          await appendActivity(tx as any, {
            projectId,
            actorId: req.user!.id,
            entityType: 'board',
            entityId: boardId,
            action: 'board.archived',
            metadata: { reason: input.reason ?? null },
          });
        }
        return updatedCount;
      });

      if (count === 0) {
        throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      }

      const updated = await findBoardInProject(app.prisma, projectId, boardId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );
};
