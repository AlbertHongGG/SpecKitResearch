'use client';

export type UsageLogFiltersValue = {
  from: string;
  to: string;
  status_code: string;
  endpoint: string;
};

export function UsageLogFilters({
  value,
  onChange,
  disabled
}: {
  value: UsageLogFiltersValue;
  onChange: (next: UsageLogFiltersValue) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">From</span>
          <input
            type="datetime-local"
            disabled={disabled}
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">To</span>
          <input
            type="datetime-local"
            disabled={disabled}
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">狀態碼（可選）</span>
          <input
            inputMode="numeric"
            placeholder="例如 401"
            disabled={disabled}
            value={value.status_code}
            onChange={(e) => onChange({ ...value, status_code: e.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>

        <label className="grid gap-1">
          <span className="text-sm text-zinc-700 dark:text-zinc-300">Endpoint（可選）</span>
          <input
            placeholder='例如 "GET /gateway/demo/hello" 或 endpoint_id'
            disabled={disabled}
            value={value.endpoint}
            onChange={(e) => onChange({ ...value, endpoint: e.target.value })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
      </div>
    </div>
  );
}
