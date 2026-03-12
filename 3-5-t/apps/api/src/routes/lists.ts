import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ERROR_CODES } from '@trello-lite/shared';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { forbidden, hideResourceExistence } from '../http/rbac/not-found-policy';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { appendActivity } from '../domain/activity/activity-service';
import { assertWritableScope } from '../domain/archived/archived';
import { findBoardInProject } from '../repos/board-repo';
import {
  archiveListOcc,
  createList,
  findBoardForListCreate,
  findListInProject,
  listActiveListIdsForBoard,
  reorderLists,
  updateListOcc,
} from '../repos/list-repo';

export const listsRoutes: FastifyPluginAsync = async (app) => {
  const zCreateList = z.object({
    boardId: z.string().min(1),
    title: z.string().min(1).max(200),
    isWipLimited: z.boolean().optional(),
    wipLimit: z.number().int().min(1).nullable().optional(),
  });

  app.post(
    '/projects/:projectId/lists',
    { preHandler: [requireAuth, projectScopeWithPermission('list:write')] },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const input = zCreateList.parse(req.body);

      const board = await findBoardForListCreate(app.prisma, projectId, input.boardId);
      if (!board) {
        hideResourceExistence();
      }

      assertWritableScope({ projectStatus: req.project!.status, boardStatus: board.status });

      const isWipLimited = input.isWipLimited ?? false;
      const wipLimit = input.wipLimit ?? null;
      if (isWipLimited && wipLimit == null) {
        throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
          wipLimit: ['Required when isWipLimited is true'],
        });
      }

      const list = await withTransaction(app.prisma, async (tx) => {
        const created = await createList(tx as any, input.boardId, input.title, { isWipLimited, wipLimit });
        await appendActivity(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'list',
          entityId: created.id,
          action: 'list.created',
          metadata: { title: created.title, boardId: created.boardId },
        });
        return created;
      });

      reply.status(201).send(list);
    }
  );

  const zUpdateList = z.object({
    version: z.number().int().min(0),
    title: z.string().min(1).max(200).nullable().optional(),
    isWipLimited: z.boolean().nullable().optional(),
    wipLimit: z.number().int().min(1).nullable().optional(),
  });

  app.patch(
    '/projects/:projectId/lists/:listId',
    { preHandler: [requireAuth, projectScopeWithPermission('list:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const listId = (req.params as any).listId as string;
      const input = zUpdateList.parse(req.body);

      const existing = await findListInProject(app.prisma, projectId, listId);
      if (!existing) {
        hideResourceExistence();
      }

      assertWritableScope({
        projectStatus: req.project!.status,
        boardStatus: existing.board.status,
        listStatus: existing.status,
      });

      const wantsWipUpdate = input.isWipLimited !== undefined || input.wipLimit !== undefined;
      if (wantsWipUpdate) {
        const role = req.membership!.role;
        if (role !== 'owner' && role !== 'admin') {
          forbidden();
        }
      }

      const nextIsWipLimited = input.isWipLimited ?? existing.isWipLimited;
      const nextWipLimit = input.wipLimit !== undefined ? input.wipLimit : existing.wipLimit;

      if (nextIsWipLimited && nextWipLimit == null) {
        throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
          wipLimit: ['Required when isWipLimited is true'],
        });
      }

      const count = await updateListOcc(app.prisma, listId, input.version, {
        ...(input.title !== undefined ? { title: input.title ?? undefined } : {}),
        ...(wantsWipUpdate
          ? {
              isWipLimited: nextIsWipLimited,
              wipLimit: nextIsWipLimited ? (nextWipLimit as any) : null,
            }
          : {}),
      });
      if (count === 0) {
        throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      }

      const updated = await findListInProject(app.prisma, projectId, listId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );

  const zArchiveList = z.object({
    version: z.number().int().min(0),
    reason: z.string().max(2000).nullable().optional(),
  });

  app.post(
    '/projects/:projectId/lists/:listId/archive',
    { preHandler: [requireAuth, projectScopeWithPermission('list:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const listId = (req.params as any).listId as string;
      const input = zArchiveList.parse(req.body);

      const existing = await findListInProject(app.prisma, projectId, listId);
      if (!existing) {
        hideResourceExistence();
      }

      assertWritableScope({
        projectStatus: req.project!.status,
        boardStatus: existing.board.status,
        listStatus: existing.status,
      });

      const count = await withTransaction(app.prisma, async (tx) => {
        const updatedCount = await archiveListOcc(tx as any, listId, input.version);
        if (updatedCount === 1) {
          await appendActivity(tx as any, {
            projectId,
            actorId: req.user!.id,
            entityType: 'list',
            entityId: listId,
            action: 'list.archived',
            metadata: { reason: input.reason ?? null },
          });
        }
        return updatedCount;
      });

      if (count === 0) {
        throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      }

      const updated = await findListInProject(app.prisma, projectId, listId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );

  const zReorder = z.object({
    orderedListIds: z.array(z.string().min(1)).min(1),
  });

  app.post(
    '/projects/:projectId/boards/:boardId/lists/reorder',
    { preHandler: [requireAuth, projectScopeWithPermission('list:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const boardId = (req.params as any).boardId as string;
      const input = zReorder.parse(req.body);

      const board = await findBoardInProject(app.prisma, projectId, boardId);
      if (!board) {
        hideResourceExistence();
      }

      assertWritableScope({ projectStatus: req.project!.status, boardStatus: board.status });

      const activeIds = await listActiveListIdsForBoard(app.prisma, boardId);
      const expected = new Set(activeIds);
      const received = new Set(input.orderedListIds);
      const sameSize = expected.size === received.size;
      const sameMembers = sameSize && activeIds.every((id) => received.has(id));
      if (!sameMembers) {
        throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
          orderedListIds: ['Must include all active lists in this board exactly once'],
        });
      }

      await reorderLists(app.prisma, boardId, input.orderedListIds);
      return { orderedListIds: input.orderedListIds };
    }
  );
};
