'use client';

export function StatsCards({ stats }: { stats: { userCount: number; purchaseCount: number; courseCountsByStatus: Record<string, number> } }) {
  const entries = Object.entries(stats.courseCountsByStatus ?? {}).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="rounded-md border border-slate-200 p-4">
        <div className="text-sm text-slate-600">使用者數</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{stats.userCount}</div>
      </div>
      <div className="rounded-md border border-slate-200 p-4">
        <div className="text-sm text-slate-600">購買數</div>
        <div className="mt-2 text-2xl font-semibold text-slate-900">{stats.purchaseCount}</div>
      </div>
      <div className="rounded-md border border-slate-200 p-4 md:col-span-1">
        <div className="text-sm text-slate-600">課程狀態</div>
        <div className="mt-2 space-y-1 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between">
              <span className="text-slate-700">{k}</span>
              <span className="font-medium text-slate-900">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
