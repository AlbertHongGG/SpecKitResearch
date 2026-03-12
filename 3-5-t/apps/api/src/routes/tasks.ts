import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ERROR_CODES } from '@trello-lite/shared';
import { requireAuth } from '../http/auth/require-auth';
import { projectScopeWithPermission } from '../http/rbac/project-scope';
import { hideResourceExistence } from '../http/rbac/not-found-policy';
import { HttpError } from '../http/errors';
import { withTransaction } from '../db/tx';
import { isUniqueConstraintError } from '../db/retry';
import { appendActivity, appendActivityWithRealtimeEvent } from '../domain/activity/activity-service';
import { generateBetween } from '../domain/ordering/position';
import { rebalanceListPositions } from '../domain/ordering/rebalance';
import { assertTaskStatusChange, assertTaskWritable, assertWipOverrideAllowed, assertWipAllowsMoveOrCreate } from '../domain/tasks/task-rules';
import { findBoardForListCreate, findListInProject } from '../repos/list-repo';
import { appendProjectEvent } from '../repos/project-event-repo';
import { findTaskInProject, findTaskPositionInList, findLastTaskPosition, countActiveTasksInList, createTask, updateTaskOcc, moveTaskOcc, archiveTaskOcc } from '../repos/task-repo';

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

export const tasksRoutes: FastifyPluginAsync = async (app) => {
  const zCreateTask = z.object({
    boardId: z.string().min(1),
    listId: z.string().min(1),
    title: z.string().min(1).max(200),
    description: z.string().nullable().optional(),
  });

  app.post(
    '/projects/:projectId/tasks',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req, reply) => {
      const projectId = (req.params as any).projectId as string;
      const input = zCreateTask.parse(req.body);

      const board = await findBoardForListCreate(app.prisma, projectId, input.boardId);
      if (!board) hideResourceExistence();

      const list = await findListInProject(app.prisma, projectId, input.listId);
      if (!list || list.boardId !== input.boardId) hideResourceExistence();

      assertTaskWritable({ projectStatus: req.project!.status, boardStatus: board.status, listStatus: list.status });

      const { task, events } = await withTransaction(app.prisma, async (tx) => {
        const currentActiveCount = await countActiveTasksInList(tx as any, list.id);
        assertWipAllowsMoveOrCreate(
          { isWipLimited: list.isWipLimited, wipLimit: list.wipLimit },
          currentActiveCount,
          undefined
        );

        const lastPos = await findLastTaskPosition(tx as any, list.id);
        const position = generateBetween(lastPos, null);

        const created = await createTask(tx as any, {
          projectId,
          boardId: board.id,
          listId: list.id,
          title: input.title,
          description: input.description ?? null,
          dueDate: null,
          priority: null,
          position,
          createdByUserId: req.user!.id,
        });

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: created.id,
          action: 'task.created',
          metadata: { title: created.title, listId: created.listId, boardId: created.boardId },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.created',
          ts: new Date(),
          payload: { task: { ...created, assignees: [] } },
        });

        return { task: created, events: [activityEvent, domainEvent] };
      });

      for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));
      reply.status(201).send(task);
    }
  );

  const zUpdateTask = z.object({
    version: z.number().int().min(0),
    title: z.string().min(1).max(200).nullable().optional(),
    description: z.string().nullable().optional(),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    priority: z.number().int().min(0).nullable().optional(),
    status: z.enum(['open', 'in_progress', 'blocked', 'done', 'archived']).nullable().optional(),
  });

  app.patch(
    '/projects/:projectId/tasks/:taskId',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zUpdateTask.parse(req.body);

      const hasUpdates =
        input.title !== undefined ||
        input.description !== undefined ||
        input.dueDate !== undefined ||
        input.priority !== undefined ||
        (input.status !== undefined && input.status !== null);
      if (!hasUpdates) {
        throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
          body: ['At least one field must be provided'],
        });
      }

      const existing = await findTaskInProject(app.prisma, projectId, taskId);
      if (!existing) hideResourceExistence();

      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: existing.board.status,
        listStatus: existing.list.status,
        taskStatus: existing.status,
      });

      if (input.status !== undefined && input.status !== null) {
        assertTaskStatusChange(existing.status as any, input.status as any);
      }

      const { updated, events } = await withTransaction(app.prisma, async (tx) => {
        const dueDate =
          input.dueDate === undefined ? undefined : input.dueDate === null ? null : new Date(`${input.dueDate}T00:00:00.000Z`);
        const data = {
          ...(input.title !== undefined ? { title: input.title ?? undefined } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.dueDate !== undefined ? { dueDate } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.status !== undefined && input.status !== null ? { status: input.status as any } : {}),
        };

        const count = await updateTaskOcc(tx as any, projectId, taskId, input.version, data);
        if (count === 0) {
          throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
        }

        const updated = await findTaskInProject(tx as any, projectId, taskId);
        if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');

        const changedFields: Array<'title' | 'description' | 'dueDate' | 'priority' | 'status'> = [];
        if (input.title !== undefined) changedFields.push('title');
        if (input.description !== undefined) changedFields.push('description');
        if (input.dueDate !== undefined) changedFields.push('dueDate');
        if (input.priority !== undefined) changedFields.push('priority');
        if (input.status !== undefined && input.status !== null) changedFields.push('status');

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: updated.id,
          action: 'task.updated',
          metadata: {
            changedFields,
            listId: updated.listId,
            boardId: updated.boardId,
          },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.updated',
          ts: new Date(),
          payload: { task: updated },
        });

        return { updated, events: [activityEvent, domainEvent] };
      });

      for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));
      return updated;
    }
  );

  const zMoveTask = z.object({
    toListId: z.string().min(1),
    beforeTaskId: z.string().min(1).nullable().optional(),
    afterTaskId: z.string().min(1).nullable().optional(),
    expectedVersion: z.number().int().min(0),
    wipOverride: z
      .object({
        enabled: z.boolean(),
        reason: z.string().max(2000).nullable().optional(),
      })
      .nullable()
      .optional(),
  });

  app.post(
    '/projects/:projectId/tasks/:taskId/move',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zMoveTask.parse(req.body);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      // Current scope must be writable.
      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: task.board.status,
        listStatus: task.list.status,
        taskStatus: task.status,
      });

      const targetList = await findListInProject(app.prisma, projectId, input.toListId);
      if (!targetList) hideResourceExistence();

      // Target scope must be writable.
      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: targetList.board.status,
        listStatus: targetList.status,
      });

      assertWipOverrideAllowed(req.membership!.role, input.wipOverride);

      const MAX_ATTEMPTS = 5;

      const events = await withTransaction(app.prisma, async (tx) => {
        // WIP check only if moving into a different list.
        if (task.listId !== targetList.id && task.status !== 'archived') {
          const currentActiveCount = await countActiveTasksInList(tx as any, targetList.id);
          assertWipAllowsMoveOrCreate(
            { isWipLimited: targetList.isWipLimited, wipLimit: targetList.wipLimit },
            currentActiveCount,
            input.wipOverride ?? undefined
          );
        }

        const after = input.afterTaskId
          ? await findTaskPositionInList(tx as any, projectId, targetList.id, input.afterTaskId)
          : null;
        const before = input.beforeTaskId
          ? await findTaskPositionInList(tx as any, projectId, targetList.id, input.beforeTaskId)
          : null;

        if (input.afterTaskId && !after) {
          throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
            afterTaskId: ['Not found in target list'],
          });
        }
        if (input.beforeTaskId && !before) {
          throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
            beforeTaskId: ['Not found in target list'],
          });
        }

        let prevPos: string | null = after?.position ?? null;
        let nextPos: string | null = before?.position ?? null;

        if (prevPos !== null && nextPos !== null && !(prevPos < nextPos)) {
          throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
            position: ['afterTaskId must be before beforeTaskId'],
          });
        }

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
          try {
            const newPos = generateBetween(prevPos, nextPos);
            const updatedCount = await moveTaskOcc(tx as any, projectId, taskId, input.expectedVersion, {
              boardId: targetList.boardId,
              listId: targetList.id,
              position: newPos,
            });

            if (updatedCount === 0) {
              throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
            }

            const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
              projectId,
              actorId: req.user!.id,
              entityType: 'task',
              entityId: taskId,
              action: 'task.moved',
              metadata: {
                toListId: targetList.id,
                beforeTaskId: input.beforeTaskId ?? null,
                afterTaskId: input.afterTaskId ?? null,
                wipOverride: input.wipOverride?.enabled ? { reason: input.wipOverride.reason ?? null } : null,
              },
            });

            const domainEvent = await appendProjectEvent(tx as any, {
              projectId,
              type: 'task.moved',
              ts: new Date(),
              payload: {
                taskId,
                fromListId: task.listId,
                toListId: targetList.id,
                position: newPos,
                version: input.expectedVersion + 1,
              },
            });

            return [activityEvent, domainEvent];
          } catch (err) {
            if (isUniqueConstraintError(err)) {
              // Tighten the lower bound to move away from the conflicting key.
              const collided = (err as any)?.meta?.target ? undefined : undefined;
              // Use the last generated position as new lower bound.
              // eslint-disable-next-line no-empty
            } else if (err instanceof HttpError && err.statusCode === 409 && err.code === ERROR_CODES.VERSION_CONFLICT) {
              throw err;
            } else if (err instanceof HttpError && err.statusCode === 409) {
              // No space left between keys; rebalance and retry from original bounds.
              await rebalanceListPositions(tx as any, targetList.id);
              prevPos = after?.position ?? null;
              nextPos = before?.position ?? null;
              continue;
            }

            if (isUniqueConstraintError(err)) {
              // On unique collision, push lower bound to midpoint and retry.
              // We recompute by setting prevPos to a freshly generated value close to nextPos.
              // Since we don't have the collided value here, approximate by stepping prevPos toward nextPos.
              // The simplest deterministic approach is to move the lower bound up by generating a new midpoint
              // and using it as the next lower bound.
              try {
                const mid = generateBetween(prevPos, nextPos);
                prevPos = mid;
                continue;
              } catch {
                await rebalanceListPositions(tx as any, targetList.id);
                prevPos = after?.position ?? null;
                nextPos = before?.position ?? null;
                continue;
              }
            }

            throw err;
          }
        }

        // If we still cannot find a unique key, rebalance once and try a final time.
        await rebalanceListPositions(tx as any, targetList.id);
        const finalPos = generateBetween(after?.position ?? null, before?.position ?? null);
        const updatedCount = await moveTaskOcc(tx as any, projectId, taskId, input.expectedVersion, {
          boardId: targetList.boardId,
          listId: targetList.id,
          position: finalPos,
        });
        if (updatedCount === 0) {
          throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
        }

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: taskId,
          action: 'task.moved',
          metadata: {
            toListId: targetList.id,
            beforeTaskId: input.beforeTaskId ?? null,
            afterTaskId: input.afterTaskId ?? null,
            wipOverride: input.wipOverride?.enabled ? { reason: input.wipOverride.reason ?? null } : null,
          },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.moved',
          ts: new Date(),
          payload: {
            taskId,
            fromListId: task.listId,
            toListId: targetList.id,
            position: finalPos,
            version: input.expectedVersion + 1,
          },
        });

        return [activityEvent, domainEvent];
      });

      for (const ev of events ?? []) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));

      const updated = await findTaskInProject(app.prisma, projectId, taskId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );

  const zArchiveTask = z.object({
    version: z.number().int().min(0),
    reason: z.string().max(2000).nullable().optional(),
  });

  app.post(
    '/projects/:projectId/tasks/:taskId/archive',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zArchiveTask.parse(req.body);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: task.board.status,
        listStatus: task.list.status,
        taskStatus: task.status,
      });

      const { count, events } = await withTransaction(app.prisma, async (tx) => {
        const updatedCount = await archiveTaskOcc(tx as any, projectId, taskId, input.version);
        if (updatedCount === 0) return { count: 0, events: [] as any[] };

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: taskId,
          action: 'task.archived',
          metadata: { reason: input.reason ?? null },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.archived',
          ts: new Date(),
          payload: { taskId, version: input.version + 1 },
        });

        return { count: updatedCount, events: [activityEvent, domainEvent] };
      });

      if (count === 0) {
        throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      }

      for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));

      const updated = await findTaskInProject(app.prisma, projectId, taskId);
      if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');
      return updated;
    }
  );

  // Assignees & status-change endpoints are implemented later (US4), but live in this module.
  const zSetAssignees = z.object({
    version: z.number().int().min(0),
    assigneeIds: z.array(z.string().min(1)),
  });

  app.post(
    '/projects/:projectId/tasks/:taskId/assignees',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zSetAssignees.parse(req.body);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: task.board.status,
        listStatus: task.list.status,
        taskStatus: task.status,
      });

      const memberships = await app.prisma.projectMembership.findMany({
        where: { projectId },
        select: { userId: true },
      });
      const allowed = new Set(memberships.map((m: { userId: string }) => m.userId));
      for (const id of input.assigneeIds) {
        if (!allowed.has(id)) {
          throw new HttpError(422, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', {
            assigneeIds: ['All assignees must be project members'],
          });
        }
      }

      const { updated, events } = await withTransaction(app.prisma, async (tx) => {
        const updatedCount = await updateTaskOcc(tx as any, projectId, taskId, input.version, {});
        if (updatedCount === 0) return { updated: null as any, events: [] as any[] };

        await tx.taskAssignee.deleteMany({ where: { taskId } });
        if (input.assigneeIds.length > 0) {
          await tx.taskAssignee.createMany({
            data: input.assigneeIds.map((userId) => ({ taskId, userId })),
          });
        }

        const updated = await findTaskInProject(tx as any, projectId, taskId);
        if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: taskId,
          action: 'task.assignees_set',
          metadata: { assigneeIds: input.assigneeIds },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.updated',
          ts: new Date(),
          payload: { task: updated },
        });

        return { updated, events: [activityEvent, domainEvent] };
      });

      if (!updated) throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));
      return updated;
    }
  );

  const zChangeStatus = z.object({
    version: z.number().int().min(0),
    toStatus: z.enum(['open', 'in_progress', 'blocked', 'done', 'archived']),
  });

  app.post(
    '/projects/:projectId/tasks/:taskId/status',
    { preHandler: [requireAuth, projectScopeWithPermission('task:write')] },
    async (req) => {
      const projectId = (req.params as any).projectId as string;
      const taskId = (req.params as any).taskId as string;
      const input = zChangeStatus.parse(req.body);

      const task = await findTaskInProject(app.prisma, projectId, taskId);
      if (!task) hideResourceExistence();

      assertTaskWritable({
        projectStatus: req.project!.status,
        boardStatus: task.board.status,
        listStatus: task.list.status,
        taskStatus: task.status,
      });

      assertTaskStatusChange(task.status as any, input.toStatus as any);

      const { updated, events } = await withTransaction(app.prisma, async (tx) => {
        const updatedCount = await updateTaskOcc(tx as any, projectId, taskId, input.version, {
          status: input.toStatus as any,
        });
        if (updatedCount === 0) return { updated: null as any, events: [] as any[] };

        const updated = await findTaskInProject(tx as any, projectId, taskId);
        if (!updated) throw new HttpError(404, ERROR_CODES.NOT_FOUND, 'Not found');

        const { event: activityEvent } = await appendActivityWithRealtimeEvent(tx as any, {
          projectId,
          actorId: req.user!.id,
          entityType: 'task',
          entityId: taskId,
          action: 'task.status_changed',
          metadata: { toStatus: input.toStatus },
        });

        const domainEvent = await appendProjectEvent(tx as any, {
          projectId,
          type: 'task.updated',
          ts: new Date(),
          payload: { task: updated },
        });

        return { updated, events: [activityEvent, domainEvent] };
      });

      if (!updated) throw new HttpError(409, ERROR_CODES.VERSION_CONFLICT, 'Version conflict');
      for (const ev of events) app.broadcaster.broadcast(projectId, toRealtimeEnvelope(ev));
      return updated;
    }
  );
};
