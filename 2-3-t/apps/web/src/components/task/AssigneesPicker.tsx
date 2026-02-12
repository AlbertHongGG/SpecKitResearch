'use client';

import { useMemo } from 'react';

export default function AssigneesPicker({
  memberships,
  value,
  readonly,
  onChange,
}: {
  memberships: Array<{ userId: string; role: string }>;
  value: string[];
  readonly: boolean;
  onChange: (next: string[]) => void;
}) {
  const sorted = useMemo(() => memberships.slice().sort((a, b) => a.userId.localeCompare(b.userId)), [memberships]);
  const selected = new Set(value);

  return (
    <div>
      <div className="text-xs font-semibold text-slate-700">指派</div>
      <div className="mt-2 max-h-48 space-y-1 overflow-auto rounded-md border border-slate-200 bg-white p-2">
        {sorted.length === 0 ? <div className="text-xs text-slate-500">尚無任何成員</div> : null}
        {sorted.map((m) => (
          <label key={m.userId} className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              disabled={readonly}
              checked={selected.has(m.userId)}
              onChange={(e) => {
                const next = new Set(value);
                if (e.target.checked) next.add(m.userId);
                else next.delete(m.userId);
                onChange(Array.from(next));
              }}
            />
            <span className="min-w-0 break-all">{m.userId}</span>
            <span className="text-[11px] text-slate-500">({m.role})</span>
          </label>
        ))}
      </div>
    </div>
  );
}
