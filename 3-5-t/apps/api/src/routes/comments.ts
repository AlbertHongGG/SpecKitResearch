import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ERROR_CODES } from '@trello-lite/shared';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { hideResourceExistence } from '../http/rbac/not-found-policy';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { appendActivityWithRealtimeEvent } from '../domain/activity/activity-service';
import { assertWritableScope } from '../domain/archived/archived';
import { appendProjectEvent } from '../repos/project-event-repo';
import { findTaskInProject } from '../repos/task-repo';
import { createComment, listCommentsForTask } from '../repos/comment-repo';

function toRealtimeEnvelope(ev: { type: string; projectId: string; eventId: string; seq: number; ts: Date; payload: unknown }) {
  return {
    type: ev.type,
    projectId: ev.projectId,
    eventId: ev.eventId,
    seq: ev.seq,
    ts: ev.ts.toISOString(),
    payload: ev.payload,
  };
}

function encodeCursor(createdAtIso: string, id: string): string {
  return Buffer.from(JSON.stringify({ createdAt: createdAtIso, id }), 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { createdAt: string; id: string } {
  const raw = Buffer.from(cursor, 'base64url').toString('utf8');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') {
    throw new HttpError(400, 'BAD_REQUEST', 'Invalid cursor');
  }
  return parsed;
}

export const commentsRoutes: FastifyPluginAsync = async (app) => {
  const zListQuery = z.object({
    cursor: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  });

  app.get(
    '/projects/:projectId/tasks/:taskId/comments',
    { preHandler: [requireAuth, projectScopeWithPermission('project:read')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const query = zListQuery.parse(req.query);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const items = await listCommentsForTask(app.prisma, { taskId, limit: query.limit, cursor });

      const page = items.slice(0, query.limit);
      const extra = items.length > query.limit ? items[query.limit] : null;

      return {
        items: page,
        nextCursor: extra ? encodeCursor(extra.createdAt.toISOString(), extra.id) : null,
      };
    }
  );

  const zCreate = z.object({
    content: z.string().min(1).max(5000),
  });

  app.post(
    '/projects/:projectId/tasks/:taskId/comments',
    { preHandler: [requireAuth, projectScopeWithPermission('comment:write')] },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zCreate.parse(req.body);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      assertWritableScope({
        projectStatus: req.project!.status,
        boardStatus: task.board.status,
        listStatus: task.list.status,
        taskStatus: task.status,
      });

        const { comment, events } = await withTransaction(app.prisma, async (tx) => {
        const created = await createComment(tx as any, {
          taskId,
          authorId: req.user!.id,
          content: input.content,
        });

          const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'comment',
          entityId: created.id,
          action: 'comment.created',
          metadata: { taskId },
        });

          const domainEvent = await appendProjectEvent(tx as any, {
            projectId,
            type: 'comment.created',
            ts: new Date(),
            payload: created,
          });

          return { comment: created, events: [activityEvent, domainEvent] };
      });

        for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));
      reply.status(201).send(comment);
    }
  );
};
