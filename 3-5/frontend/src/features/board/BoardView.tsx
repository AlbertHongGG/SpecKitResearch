'use client';

import { useMemo, useState } from 'react';

import type { List, Task } from '../../lib/api/client';
import { TaskDrawer } from '../tasks/TaskDrawer';
import { WipOverrideModal } from '../wip/WipOverrideModal';
import { useBoardDnd } from './dnd/useBoardDnd';
import { ListColumn } from './ListColumn';

export function BoardView(props: {
    projectId: string;
    lists: List[];
    tasks: Task[];
    canWrite: boolean;
    canManageWip: boolean;
}) {
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

    const dnd = useBoardDnd({
        projectId: props.projectId,
        lists: props.lists,
        tasks: props.tasks,
        canOverrideWip: props.canManageWip,
    });

    const listsSorted = useMemo(() => {
        return [...props.lists].sort((a, b) => a.order - b.order);
    }, [props.lists]);

    const tasksByListId = useMemo(() => {
        const map = new Map<string, Task[]>();
        for (const t of props.tasks) {
            if (!map.has(t.listId)) map.set(t.listId, []);
            map.get(t.listId)!.push(t);
        }
        return map;
    }, [props.tasks]);

    if (!listsSorted.length) {
        return (
            <div className="mt-4 rounded-lg border bg-white p-6 text-sm text-slate-600">
                此看板目前沒有欄位。你可以先建立一個欄位（US1 先完成基礎；US3 會補齊完整互動）。
            </div>
        );
    }

    return (
        <>
            <div className="mt-4 -mx-4 overflow-x-auto pb-4">
                <div className="flex w-max snap-x snap-mandatory gap-3 px-4">
                    {listsSorted.map((l) => (
                        <div key={l.id} className="snap-start">
                            <ListColumn
                                projectId={props.projectId}
                                list={l}
                                tasks={tasksByListId.get(l.id) ?? []}
                                canWrite={props.canWrite}
                                canManageWip={props.canManageWip}
                                onOpenTask={(t) => setActiveTaskId(t.id)}
                                dnd={props.canWrite ? dnd : undefined}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <TaskDrawer
                projectId={props.projectId}
                taskId={activeTaskId}
                canWrite={props.canWrite}
                onClose={() => setActiveTaskId(null)}
            />

            {dnd.pendingOverride && dnd.overrideInfo ? (
                <WipOverrideModal
                    open={true}
                    listTitle={dnd.overrideInfo.listTitle}
                    limit={dnd.overrideInfo.limit}
                    count={dnd.overrideInfo.count}
                    onCancel={() => dnd.cancelOverride()}
                    onSubmit={(reason) => dnd.submitOverride(reason)}
                />
            ) : null}
        </>
    );
}
