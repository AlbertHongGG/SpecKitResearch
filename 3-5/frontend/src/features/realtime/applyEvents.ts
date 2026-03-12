import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { ActivityEvent, Board, Comment, List, SnapshotResponse, Task } from '../../lib/api/client';
import { applyAuthoritativeOrder, type AuthoritativeOrder } from '../board/cache/updateOrdering';

export type ProjectEvent = {
    id: string;
    type: string;
    data: unknown;
};

type ActivityPage = { events: ActivityEvent[]; nextCursor: string | null };

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object') return null;
    return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function asStringArray(value: unknown): string[] | undefined {
    return Array.isArray(value) && value.every((v) => typeof v === 'string') ? (value as string[]) : undefined;
}

function upsertTask(tasks: Task[], task: Task): Task[] {
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx === -1) return [...tasks, task];
    const next = tasks.slice();
    next[idx] = { ...next[idx], ...task };
    return next;
}

function updateList(lists: List[], patch: Partial<List> & { id: string }): List[] {
    const idx = lists.findIndex((l) => l.id === patch.id);
    if (idx === -1) return lists;
    const next = lists.slice();
    next[idx] = { ...next[idx], ...patch };
    return next;
}

function applyReorder<T extends { id: string; order: number }>(items: T[], orderedIds: string[]): T[] {
    const orderById = new Map(orderedIds.map((id, i) => [id, i] as const));
    return items.map((it) => {
        const nextOrder = orderById.get(it.id);
        if (typeof nextOrder !== 'number') return it;
        return { ...it, order: nextOrder };
    });
}

export function applyProjectEvent(queryClient: QueryClient, projectId: string, event: ProjectEvent) {
    const data = asRecord(event.data);

    if (event.type === 'ActivityAppended') {
        const appended = (data?.event as ActivityEvent | undefined) ?? undefined;
        if (appended) {
            queryClient.setQueryData<InfiniteData<ActivityPage>>(['activity', projectId], (old) => {
                if (!old || !old.pages.length) return old;
                const first = old.pages[0];
                const exists = (first.events ?? []).some((e) => e.id === appended.id);
                if (exists) return old;
                const nextFirst: ActivityPage = { ...first, events: [appended, ...(first.events ?? [])] };
                return { ...old, pages: [nextFirst, ...old.pages.slice(1)] };
            });
        }
    }

    if (event.type === 'CommentAdded') {
        const comment = (data?.comment as Comment | undefined) ?? undefined;
        if (comment) {
            queryClient.setQueryData(['taskComments', comment.taskId], (old: { comments: Comment[] } | undefined) => {
                const comments = old?.comments ?? [];
                if (comments.some((c) => c.id === comment.id)) return old;
                return { comments: [...comments, comment].sort((a, b) => a.createdAt.localeCompare(b.createdAt)) };
            });
        }
    }

    queryClient.setQueryData(['snapshot', projectId], (old: SnapshotResponse | undefined) => {
        if (!old) return old;

        switch (event.type) {
            case 'TaskCreated':
            case 'TaskUpdated':
            case 'TaskStatusUpdated':
            case 'TaskArchived': {
                const task = (data?.task as Task | undefined) ?? undefined;
                if (!task) return old;
                return { ...old, tasks: upsertTask(old.tasks, task) };
            }
            case 'TaskMoved': {
                const authoritativeOrder = (data?.authoritativeOrder as AuthoritativeOrder | undefined) ?? undefined;
                if (!authoritativeOrder) return old;
                let next = applyAuthoritativeOrder(old, authoritativeOrder);

                // Best-effort: update moved task boardId/listId.
                const movedTaskId = asString(data?.taskId);
                const toBoardId = asString(data?.toBoardId);
                if (movedTaskId) {
                    next = {
                        ...next,
                        tasks: next.tasks.map((t) => {
                            if (t.id !== movedTaskId) return t;
                            return {
                                ...t,
                                listId: authoritativeOrder.listId,
                                boardId: toBoardId ?? t.boardId,
                            };
                        }),
                    };
                }
                return next;
            }
            case 'ListWipUpdated': {
                const listId = asString(data?.listId);
                if (!listId) return old;
                const isWipLimited = data?.isWipLimited === true;
                const wipLimit = typeof data?.wipLimit === 'number' ? data.wipLimit : null;
                return {
                    ...old,
                    lists: updateList(old.lists, {
                        id: listId,
                        isWipLimited,
                        wipLimit,
                    }),
                };
            }
            case 'ListReordered': {
                const boardId = asString(data?.boardId);
                const orderedListIds = asStringArray(data?.orderedListIds);
                if (!boardId || !orderedListIds) return old;
                const lists = old.lists.map((l) => l);
                const affected = lists.filter((l) => l.boardId === boardId);
                const unaffected = lists.filter((l) => l.boardId !== boardId);
                return {
                    ...old,
                    lists: [...unaffected, ...applyReorder(affected, orderedListIds)],
                };
            }
            case 'BoardReordered': {
                const orderedBoardIds = asStringArray(data?.orderedBoardIds);
                if (!orderedBoardIds) return old;
                const boards: Board[] = applyReorder(old.boards, orderedBoardIds);
                return { ...old, boards };
            }
            case 'ProjectArchived': {
                return { ...old, project: { ...old.project, status: 'archived' } };
            }
            case 'BoardArchived': {
                const boardId = asString(data?.boardId);
                if (!boardId) return old;
                return {
                    ...old,
                    boards: old.boards.map((b) => (b.id === boardId ? { ...b, status: 'archived' } : b)),
                };
            }
            case 'ListArchived': {
                const listId = asString(data?.listId);
                if (!listId) return old;
                return {
                    ...old,
                    lists: old.lists.map((l) => (l.id === listId ? { ...l, status: 'archived' } : l)),
                };
            }
            default:
                return old;
        }
    });
}
