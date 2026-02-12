'use client';

import { useMemo, useState } from 'react';

export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'archived';

const allowed: Record<TaskStatus, TaskStatus[]> = {
  open: ['in_progress', 'blocked', 'done', 'archived'],
  in_progress: ['blocked', 'done', 'archived'],
  blocked: ['in_progress', 'done', 'archived'],
  done: ['archived'],
  archived: [],
};

export default function TaskStatusControl({
  status,
  readonly,
  onChange,
}: {
  status: TaskStatus;
  readonly: boolean;
  onChange: (toStatus: TaskStatus) => void | Promise<void>;
}) {
  const options = useMemo(() => allowed[status], [status]);
  const [next, setNext] = useState<TaskStatus | ''>('');

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">狀態</div>
      <div className="mt-1 text-sm text-slate-900" data-testid="task-status">
        目前：{status}
      </div>

      {options.length === 0 ? (
        <div className="mt-2 text-xs text-slate-500">此狀態為終態或無可用轉換。</div>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <select
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
            disabled={readonly}
            value={next}
            onChange={(e) => setNext(e.target.value as any)}
            data-testid="task-status-select"
          >
            <option value="">選擇新狀態…</option>
            {options.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
            disabled={readonly || !next}
            onClick={() => {
              if (!next) return;
              void onChange(next as TaskStatus);
              setNext('');
            }}
            data-testid="task-status-apply"
          >
            套用
          </button>
        </div>
      )}
    </div>
  );
}
