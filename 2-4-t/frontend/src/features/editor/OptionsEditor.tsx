'use client';

import type { Option } from '@app/contracts';
import { newId } from './state';

export function OptionsEditor({
  options,
  onChange
}: {
  options: Option[];
  onChange: (next: Option[]) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">Options</div>
        <button
          className="rounded border px-2 py-1 text-sm"
          type="button"
          onClick={() => onChange([...options, { id: newId('opt'), label: 'Option', value: 'value' }])}
        >
          Add option
        </button>
      </div>

      {options.length === 0 ? <div className="text-sm text-gray-600">No options.</div> : null}

      <div className="space-y-2">
        {options.map((o, idx) => (
          <div key={o.id} className="grid grid-cols-12 gap-2">
            <input
              className="col-span-5 rounded border px-2 py-1 text-sm"
              value={o.label}
              onChange={(e) => {
                const next = options.slice();
                next[idx] = { ...o, label: e.target.value };
                onChange(next);
              }}
            />
            <input
              className="col-span-5 rounded border px-2 py-1 text-sm"
              value={o.value}
              onChange={(e) => {
                const next = options.slice();
                next[idx] = { ...o, value: e.target.value };
                onChange(next);
              }}
            />
            <button
              className="col-span-2 rounded border px-2 py-1 text-sm"
              type="button"
              onClick={() => onChange(options.filter((x) => x.id !== o.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
