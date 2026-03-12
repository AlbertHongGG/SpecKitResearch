'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type DragEvent, useMemo, useState } from 'react';

import { api, type List, type SnapshotResponse, type Task } from '../../../lib/api/client';
import { useToast } from '../../../components/Toast';
import { applyAuthoritativeOrder, type AuthoritativeOrder } from '../cache/updateOrdering';

type MoveVars = {
    taskId: string;
    toListId: string;
    beforeTaskId?: string | null;
    afterTaskId?: string | null;
    wipOverrideReason?: string | null;
};

export function useBoardDnd(props: {
    projectId: string;
    lists?: List[];
    tasks: Task[];
    canOverrideWip?: boolean;
}) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
    const [pendingOverride, setPendingOverride] = useState<MoveVars | null>(null);

    const tasksById = useMemo(() => {
        const map = new Map<string, Task>();
        for (const t of props.tasks) map.set(t.id, t);
        return map;
    }, [props.tasks]);

    const listsById = useMemo(() => {
        const map = new Map<string, List>();
        for (const l of props.lists ?? []) map.set(l.id, l);
        return map;
    }, [props.lists]);

    const countByListId = useMemo(() => {
        const map = new Map<string, number>();
        for (const t of props.tasks) {
            if (t.status === 'archived') continue;
            map.set(t.listId, (map.get(t.listId) ?? 0) + 1);
        }
        return map;
    }, [props.tasks]);

    const moveMutation = useMutation({
        mutationFn: async (vars: MoveVars) => {
            const task = tasksById.get(vars.taskId);
            if (!task) throw new Error('Task not found');
            return api.moveTask(vars.taskId, {
                expectedVersion: task.version,
                toListId: vars.toListId,
                beforeTaskId: vars.beforeTaskId,
                afterTaskId: vars.afterTaskId,
                wipOverrideReason: vars.wipOverrideReason ?? null,
            });
        },
        onSuccess: async (res) => {
            queryClient.setQueryData(['snapshot', props.projectId], (old: SnapshotResponse | undefined) => {
                if (!old) return old;

                // Apply authoritative ordering first.
                let next = applyAuthoritativeOrder(old, res.authoritativeOrder as AuthoritativeOrder);

                // Also patch the moved task with server truth (version/status/etc).
                next = {
                    ...next,
                    tasks: next.tasks.map((t) => (t.id === res.task.id ? { ...t, ...res.task } : t)),
                };

                return next;
            });

            await queryClient.invalidateQueries({ queryKey: ['snapshot', props.projectId] });
        },
        onError: (err) => {
            toast.push(err instanceof Error ? err.message : '移動任務失敗', 'error');
        },
    });

    const requiresWipOverride = (vars: Omit<MoveVars, 'taskId'> & { taskId: string }) => {
        const task = tasksById.get(vars.taskId);
        if (!task) return false;
        if (task.listId === vars.toListId) return false;

        const list = listsById.get(vars.toListId);
        if (!list || !list.isWipLimited) return false;
        const limit = list.wipLimit ?? 0;
        if (limit <= 0) return false;

        const count = countByListId.get(vars.toListId) ?? 0;
        return count >= limit;
    };

    const requestMove = (vars: MoveVars) => {
        if (requiresWipOverride(vars)) {
            if (props.canOverrideWip) {
                setPendingOverride(vars);
                return;
            }
            toast.push('已達 WIP 上限，無法移動至此欄位', 'error');
            return;
        }

        moveMutation.mutate(vars);
    };

    const getTaskCardDragProps = (taskId: string) => {
        return {
            draggable: true,
            onDragStart: (id: string) => setDraggingTaskId(id || taskId),
        };
    };

    const getDropZoneProps = (vars: Omit<MoveVars, 'taskId'>) => {
        return {
            onDragOver: (e: DragEvent) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            },
            onDrop: (e: DragEvent) => {
                e.preventDefault();
                const droppedTaskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
                if (!droppedTaskId) return;
                requestMove({
                    taskId: droppedTaskId,
                    toListId: vars.toListId,
                    beforeTaskId: vars.beforeTaskId ?? null,
                    afterTaskId: vars.afterTaskId ?? null,
                });
                setDraggingTaskId(null);
            },
        };
    };

    return {
        draggingTaskId,
        isMoving: moveMutation.isPending,
        getTaskCardDragProps,
        getDropZoneProps,
        pendingOverride,
        overrideInfo: pendingOverride
            ? (() => {
                const list = listsById.get(pendingOverride.toListId);
                const limit = list?.wipLimit ?? 0;
                const count = countByListId.get(pendingOverride.toListId) ?? 0;
                return {
                    listTitle: list?.title ?? pendingOverride.toListId,
                    limit,
                    count,
                };
            })()
            : null,
        cancelOverride: () => setPendingOverride(null),
        submitOverride: (reason: string) => {
            if (!pendingOverride) return;
            const vars = { ...pendingOverride, wipOverrideReason: reason };
            setPendingOverride(null);
            moveMutation.mutate(vars);
        },
    };
}
