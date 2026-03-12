'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchAdminUsageStats } from '@/features/admin/admin.queries';

function isoFromDate(d: Date): string {
  return d.toISOString();
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm text-zinc-600 dark:text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const now = useMemo(() => new Date(), []);
  const from = useMemo(() => new Date(now.getTime() - 24 * 60 * 60 * 1000), [now]);

  const query = useQuery({
    queryKey: ['admin-usage-stats', { from: isoFromDate(from), to: isoFromDate(now) }],
    queryFn: () =>
      fetchAdminUsageStats({
        from: isoFromDate(from),
        to: isoFromDate(now),
      }),
  });

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            近 24 小時全站狀態碼概覽。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/services"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            管理 Services
          </Link>
          <Link
            href="/admin/usage"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            查詢 Usage Logs
          </Link>
        </div>
      </div>

      {query.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}

      {query.isError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          儀表板載入失敗
        </div>
      ) : null}

      {query.isSuccess ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="401 Unauthorized" value={query.data.unauthorized_401_count} />
          <StatCard label="403 Forbidden" value={query.data.forbidden_403_count} />
          <StatCard label="429 Rate Limited" value={query.data.rate_limited_429_count} />
          <StatCard label="5xx Server Error" value={query.data.server_error_5xx_count} />
        </div>
      ) : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">快速入口</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: '/admin/services', label: 'Services' },
            { href: '/admin/endpoints', label: 'Endpoints' },
            { href: '/admin/scopes', label: 'Scopes' },
            { href: '/admin/scope-rules', label: 'Scope Rules' },
            { href: '/admin/rate-limit', label: 'Rate Limit' },
            { href: '/admin/keys', label: 'Keys' },
            { href: '/admin/users', label: 'Users' },
            { href: '/admin/usage', label: 'Usage Logs' },
            { href: '/admin/audit', label: 'Audit Logs' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
