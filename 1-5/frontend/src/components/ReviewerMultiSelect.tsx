import { useMemo } from 'react';

import type { ReviewerListItem } from '../services/adminFlows';

export function ReviewerMultiSelect(props: {
  reviewers: ReviewerListItem[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selectedSet = useMemo(() => new Set(props.value), [props.value]);

  return (
    <div className="rounded-md border border-slate-200 p-2">
      <div className="text-xs text-slate-600">已選 {props.value.length} 位</div>
      <div className="mt-2 max-h-40 space-y-1 overflow-auto">
        {props.reviewers.map((r) => {
          const checked = selectedSet.has(r.id);
          return (
            <label key={r.id} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  const next = new Set(props.value);
                  if (checked) next.delete(r.id);
                  else next.add(r.id);
                  props.onChange(Array.from(next));
                }}
              />
              <span className="text-slate-800">{r.email}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
