'use client';

import type { UsageStats } from '@/features/usage/usage.queries';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

export function UsageStatsCards({ stats }: { stats: UsageStats }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="401 Unauthorized" value={stats.unauthorized_401_count} />
      <StatCard label="403 Forbidden" value={stats.forbidden_403_count} />
      <StatCard label="429 Rate Limited" value={stats.rate_limited_429_count} />
      <StatCard label="5xx Server Error" value={stats.server_error_5xx_count} />
    </div>
  );
}
