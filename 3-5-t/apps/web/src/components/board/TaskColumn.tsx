'use client';

import { useDroppable } from '@dnd-kit/core';
import type { ReactNode } from 'react';

export default function TaskColumn({
  list,
  wipCount,
  readonly,
  canWriteTask,
  onCreateTask,
  children,
}: {
  list: {
    id: string;
    isWipLimited: boolean;
    wipLimit: number | null;
  };
  wipCount: number;
  readonly: boolean;
  canWriteTask: boolean;
  onCreateTask: (title: string) => void | Promise<void>;
  children: ReactNode;
}) {
  const droppable = useDroppable({
    id: list.id,
    data: { type: 'list', listId: list.id },
    disabled: readonly || !canWriteTask,
  });

  const limitText = list.isWipLimited ? `${wipCount}/${list.wipLimit ?? '—'}` : `${wipCount}`;
  const wipTone = list.isWipLimited && list.wipLimit !== null && wipCount > list.wipLimit ? 'text-red-700' : 'text-slate-700';

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold text-slate-700">Tasks</div>
        <div className={`text-xs ${wipTone}`} data-testid={`wip-${list.id}`}>
          WIP: {limitText}
        </div>
      </div>

      {readonly || !canWriteTask ? null : (
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const title = String(fd.get('title') ?? '').trim();
            if (!title) return;
            void onCreateTask(title);
            e.currentTarget.reset();
          }}
        >
          <input
            name="title"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
            placeholder="新增 task…"
            maxLength={200}
            autoComplete="off"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            data-testid={`add-task-${list.id}`}
          >
            新增
          </button>
        </form>
      )}

      <div
        ref={droppable.setNodeRef}
        className={`mt-3 min-h-10 space-y-2 rounded-md border border-dashed p-2 ${
          droppable.isOver ? 'border-slate-400 bg-slate-50' : 'border-slate-200'
        }`}
        data-testid={`task-dropzone-${list.id}`}
      >
        {children}
      </div>
    </div>
  );
}
