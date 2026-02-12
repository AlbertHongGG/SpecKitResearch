'use client';

import { useState } from 'react';

export default function TaskEditForm({
  initial,
  readonly,
  onSave,
}: {
  initial: {
    title: string;
    description: string | null;
    dueDate: string | null;
    priority: number | null;
  };
  readonly: boolean;
  onSave: (patch: { title?: string; description?: string | null; dueDate?: string | null; priority?: number | null }) =>
    | void
    | Promise<void>;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? '');
  const [dueDate, setDueDate] = useState(initial.dueDate ?? '');
  const [priority, setPriority] = useState<string>(initial.priority == null ? '' : String(initial.priority));

  const dirty =
    title !== initial.title ||
    description !== (initial.description ?? '') ||
    dueDate !== (initial.dueDate ?? '') ||
    priority !== (initial.priority == null ? '' : String(initial.priority));

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-semibold text-slate-700">標題</label>
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={title}
          disabled={readonly}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          data-testid="task-title"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700">描述</label>
        <textarea
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
          value={description}
          disabled={readonly}
          rows={4}
          onChange={(e) => setDescription(e.target.value)}
          data-testid="task-description"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700">到期日</label>
          <input
            type="date"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={dueDate}
            disabled={readonly}
            onChange={(e) => setDueDate(e.target.value)}
            data-testid="task-due-date"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700">優先度</label>
          <input
            inputMode="numeric"
            className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
            value={priority}
            disabled={readonly}
            onChange={(e) => {
              const v = e.target.value;
              if (v === '') return setPriority('');
              if (/^\d+$/.test(v)) setPriority(v);
            }}
            placeholder="(可選)"
            data-testid="task-priority"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
          disabled={readonly || !dirty || title.trim().length === 0}
          onClick={() =>
            onSave({
              title: title.trim(),
              description: description.length ? description : null,
              dueDate: dueDate.length ? dueDate : null,
              priority: priority.length ? Number(priority) : null,
            })
          }
          data-testid="task-save"
        >
          儲存
        </button>
      </div>
    </div>
  );
}
