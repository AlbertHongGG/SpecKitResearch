'use client';

import { useMemo, useState } from 'react';

export default function WipSettings({
  isWipLimited,
  wipLimit,
  disabled,
  onChange,
}: {
  isWipLimited: boolean;
  wipLimit: number | null;
  disabled: boolean;
  onChange: (patch: { isWipLimited: boolean; wipLimit: number | null }) => void | Promise<void>;
}) {
  const [localEnabled, setLocalEnabled] = useState(isWipLimited);
  const [localLimit, setLocalLimit] = useState(String(wipLimit ?? 1));

  const parsedLimit = useMemo(() => {
    const n = Number(localLimit);
    return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
  }, [localLimit]);

  return (
    <div className="mt-2 rounded-md border border-slate-100 bg-slate-50 p-2">
      <div className="text-xs font-semibold text-slate-700">WIP</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={localEnabled}
            disabled={disabled}
            onChange={(e) => setLocalEnabled(e.target.checked)}
          />
          啟用
        </label>

        <input
          type="number"
          min={1}
          className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          disabled={disabled || !localEnabled}
          value={localLimit}
          onChange={(e) => setLocalLimit(e.target.value)}
        />

        <button
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
          disabled={disabled || (localEnabled && parsedLimit == null)}
          onClick={() => onChange({ isWipLimited: localEnabled, wipLimit: localEnabled ? parsedLimit : null })}
          data-testid="save-wip"
        >
          儲存
        </button>
      </div>
    </div>
  );
}
