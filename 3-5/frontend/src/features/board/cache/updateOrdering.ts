import type { SnapshotResponse, Task } from '../../../lib/api/client';

export type AuthoritativeOrder = {
    listId: string;
    tasks: { taskId: string; position: string }[];
};

export function applyAuthoritativeOrder(snapshot: SnapshotResponse, order: AuthoritativeOrder): SnapshotResponse {
    const positionByTaskId = new Map(order.tasks.map((t) => [t.taskId, t.position] as const));

    const tasks: Task[] = snapshot.tasks.map((t) => {
        const nextPos = positionByTaskId.get(t.id);
        if (!nextPos) return t;
        if (t.position === nextPos) return t;
        return { ...t, position: nextPos, listId: order.listId };
    });

    return { ...snapshot, tasks };
}
