'use client';

import { useMemo } from 'react';

export default function ListReorder({
  lists,
  disabled,
  onReorder,
}: {
  lists: Array<{ id: string; title: string }>;
  disabled: boolean;
  onReorder: (orderedListIds: string[]) => void | Promise<void>;
}) {
  const ids = useMemo(() => lists.map((l) => l.id), [lists]);

  async function move(fromIdx: number, toIdx: number) {
    if (toIdx < 0 || toIdx >= ids.length) return;
    const next = ids.slice();
    const [item] = next.splice(fromIdx, 1);
    if (!item) return;
    next.splice(toIdx, 0, item);
    await onReorder(next);
  }

  if (lists.length < 2) return null;

  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 p-3">
      <div className="text-xs font-semibold text-slate-700">List 重新排序</div>
      <ul className="mt-2 space-y-2" data-testid="list-reorder">
        {lists.map((l, idx) => (
          <li key={l.id} className="flex items-center justify-between gap-3">
            <div className="min-w-0 break-all text-sm text-slate-800">{l.title}</div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                disabled={disabled || idx === 0}
                onClick={() => move(idx, idx - 1)}
                data-testid={`move-left-${l.id}`}
              >
                ←
              </button>
              <button
                className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                disabled={disabled || idx === lists.length - 1}
                onClick={() => move(idx, idx + 1)}
                data-testid={`move-right-${l.id}`}
              >
                →
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
