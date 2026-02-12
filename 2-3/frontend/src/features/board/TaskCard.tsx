'use client';

import type { Task } from '../../lib/api/client';

export function TaskCard(props: {
    task: Task;
    onOpen: () => void;
    draggable?: boolean;
    onDragStart?: (taskId: string) => void;
}) {
    return (
        <button
            type="button"
            className="w-full rounded border bg-white p-2 text-left text-sm hover:bg-slate-50"
            onClick={props.onOpen}
            draggable={props.draggable}
            onDragStart={(e) => {
                if (!props.draggable) return;
                e.dataTransfer.setData('text/plain', props.task.id);
                e.dataTransfer.effectAllowed = 'move';
                props.onDragStart?.(props.task.id);
            }}
        >
            <div className="font-medium leading-snug">{props.task.title}</div>
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                <div>{props.task.status}</div>
                {props.task.assigneeIds.length ? <div>指派 {props.task.assigneeIds.length}</div> : null}
                {props.task.dueDate ? <div>Due {props.task.dueDate}</div> : null}
            </div>
        </button>
    );
}
