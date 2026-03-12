import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { RealtimeKnownServerMessage } from '@trello-lite/shared';
import type { Comment, ProjectSnapshot, Task } from '../queries/task';

type ActivityLogEntry = {
  id: string;
  projectId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  metadata?: unknown;
};

type ListActivityResponse = {
  items: ActivityLogEntry[];
  nextCursor: string | null;
};

function upsertTask(tasks: Task[], next: Task): Task[] {
  const idx = tasks.findIndex((t) => t.id === next.id);
  if (idx === -1) return [...tasks, next];
  const copy = tasks.slice();
  copy[idx] = next;
  return copy;
}

function updateTask(tasks: Task[], taskId: string, fn: (prev: Task) => Task): Task[] {
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx === -1) return tasks;
  const copy = tasks.slice();
  copy[idx] = fn(copy[idx]!);
  return copy;
}

export function applyRealtimeEvent(queryClient: QueryClient, projectId: string, msg: RealtimeKnownServerMessage) {
  switch (msg.type) {
    case 'task.created':
      queryClient.setQueryData(['projects', projectId, 'snapshot'], (prev: ProjectSnapshot | undefined) => {
        if (!prev) return prev;
        const created = msg.payload.task as unknown as Task;
        return { ...prev, tasks: upsertTask(prev.tasks, created) };
      });
      return;

    case 'task.updated':
      queryClient.setQueryData(['projects', projectId, 'snapshot'], (prev: ProjectSnapshot | undefined) => {
        if (!prev) return prev;
        const updated = msg.payload.task as unknown as Task;
        return { ...prev, tasks: upsertTask(prev.tasks, updated) };
      });
      return;

    case 'task.archived':
      queryClient.setQueryData(['projects', projectId, 'snapshot'], (prev: ProjectSnapshot | undefined) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: updateTask(prev.tasks, msg.payload.taskId, (t) => ({ ...t, status: 'archived', version: msg.payload.version })),
        };
      });
      return;

    case 'task.moved':
      queryClient.setQueryData(['projects', projectId, 'snapshot'], (prev: ProjectSnapshot | undefined) => {
        if (!prev) return prev;

        const list = prev.lists.find((l) => l.id === msg.payload.toListId) ?? null;
        const nextBoardId = list?.boardId;

        return {
          ...prev,
          tasks: updateTask(prev.tasks, msg.payload.taskId, (t) => ({
            ...t,
            listId: msg.payload.toListId,
            boardId: nextBoardId ?? t.boardId,
            position: msg.payload.position,
            version: msg.payload.version,
          })),
        };
      });
      return;

    case 'comment.created': {
      const created = msg.payload as unknown as Comment;
      const taskId = created.taskId;
      queryClient.setQueryData(['projects', projectId, 'tasks', taskId, 'comments'], (prev: Comment[] | undefined) => {
        const list = prev ?? [];
        if (list.some((c) => c.id === created.id)) return list;
        return [...list, created];
      });
      return;
    }

    case 'activity.appended': {
      const created = msg.payload as unknown as ActivityLogEntry;
      queryClient.setQueryData(['projects', projectId, 'activity'], (prev: InfiniteData<ListActivityResponse> | undefined) => {
        if (!prev) return prev;
        const pages = prev.pages.slice();
        if (pages.length === 0) return prev;

        const first = pages[0]!;
        if (first.items.some((i) => i.id === created.id)) return prev;

        pages[0] = { ...first, items: [created, ...first.items] };
        return { ...prev, pages };
      });
      return;
    }

    default:
      return;
  }
}
