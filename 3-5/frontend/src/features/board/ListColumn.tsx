'use client';

import { type DragEvent, useMemo } from 'react';

import type { List, Task } from '../../lib/api/client';
import { CreateTaskForm } from '../tasks/CreateTaskForm';
import { WipSettingsPanel } from '../lists/WipSettingsPanel';
import { TaskCard } from './TaskCard';

export function ListColumn(props: {
    projectId: string;
    list: List;
    tasks: Task[];
    canWrite: boolean;
    canManageWip: boolean;
    onOpenTask: (task: Task) => void;
    dnd?: {
        getTaskCardDragProps: (taskId: string) => {
            draggable: boolean;
            onDragStart: (taskId: string) => void;
        };
        getDropZoneProps: (vars: {
            toListId: string;
            beforeTaskId?: string | null;
            afterTaskId?: string | null;
        }) => {
            onDragOver: (e: DragEvent) => void;
            onDrop: (e: DragEvent) => void;
        };
    };
}) {
    const tasksSorted = useMemo(() => {
        return [...props.tasks].sort((a, b) => a.position.localeCompare(b.position));
    }, [props.tasks]);

    const count = tasksSorted.length;
    const isWipBlocked =
        props.list.isWipLimited && typeof props.list.wipLimit === 'number' && count >= props.list.wipLimit;

    return (
        <div className="flex w-[280px] flex-shrink-0 flex-col rounded-lg border bg-white">
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="font-medium">{props.list.title}</div>
                <div className="flex items-center gap-2">
                    {props.list.isWipLimited ? (
                        <div className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                            WIP {count}/{props.list.wipLimit ?? '-'}
                        </div>
                    ) : null}
                    <WipSettingsPanel projectId={props.projectId} list={props.list} canManage={props.canManageWip} />
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-3 p-3">
                <div className="flex flex-col gap-2">
                    {tasksSorted.length ? (
                        tasksSorted.map((t) => (
                            <div
                                key={t.id}
                                className="rounded"
                                {...(props.dnd
                                    ? props.dnd.getDropZoneProps({ toListId: props.list.id, beforeTaskId: t.id, afterTaskId: null })
                                    : {})}
                            >
                                <TaskCard
                                    task={t}
                                    onOpen={() => props.onOpenTask(t)}
                                    draggable={props.dnd ? true : false}
                                    onDragStart={props.dnd ? props.dnd.getTaskCardDragProps(t.id).onDragStart : undefined}
                                />
                            </div>
                        ))
                    ) : (
                        <div
                            className="rounded border border-dashed bg-slate-50 p-3 text-sm text-slate-600"
                            {...(props.dnd
                                ? props.dnd.getDropZoneProps({ toListId: props.list.id, beforeTaskId: null, afterTaskId: null })
                                : {})}
                        >
                            此欄位還沒有任務。
                        </div>
                    )}

                    {tasksSorted.length && props.dnd ? (
                        <div
                            className="rounded border border-dashed bg-transparent p-2 text-xs text-slate-500"
                            {...props.dnd.getDropZoneProps({
                                toListId: props.list.id,
                                beforeTaskId: null,
                                afterTaskId: tasksSorted[tasksSorted.length - 1]!.id,
                            })}
                        >
                            拖到此處以放到欄位末端
                        </div>
                    ) : null}
                </div>

                {props.canWrite ? (
                    <div>
                        <CreateTaskForm
                            projectId={props.projectId}
                            listId={props.list.id}
                            disabled={isWipBlocked}
                            onCreated={(task) => props.onOpenTask(task)}
                        />
                        {isWipBlocked ? (
                            <div className="mt-1 text-xs text-amber-700">已達 WIP 上限，需先移出/完成任務。</div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
