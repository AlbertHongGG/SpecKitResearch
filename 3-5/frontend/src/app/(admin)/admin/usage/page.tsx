'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { fetchAdminUsageLogs } from '@/features/admin/admin.queries';
import { UsageLogTable } from '@/features/usage/UsageLogTable';
import type { UsageLog } from '@/features/usage/usage.queries';

function toIsoEndOfMinute(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  d.setSeconds(59, 999);
  return d.toISOString();
}

function toIsoStart(dtLocal: string): string {
  const d = new Date(dtLocal);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  return d.toISOString();
}

function nowLocalMinute(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdminUsageLogsPage() {
  const toDefault = useMemo(() => nowLocalMinute(), []);
  const fromDefault = useMemo(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - 60);
    d.setSeconds(0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  const [from, setFrom] = useState(fromDefault);
  const [to, setTo] = useState(toDefault);
  const [statusCode, setStatusCode] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKeyId, setApiKeyId] = useState('');
  const [userId, setUserId] = useState('');

  const query = useQuery({
    queryKey: ['admin-usage-logs', { from, to, statusCode, endpoint, apiKeyId, userId }],
    queryFn: async () => {
      const rows = await fetchAdminUsageLogs({
        from: toIsoStart(from),
        to: toIsoEndOfMinute(to),
        status_code: statusCode ? Number(statusCode) : undefined,
        endpoint: endpoint.trim() || undefined,
        api_key_id: apiKeyId.trim() || undefined,
        user_id: userId.trim() || undefined,
      });

      return rows as unknown as UsageLog[];
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage Logs</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">查詢全站受保護 API 呼叫紀錄。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 lg:grid-cols-6">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">From</span>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">To</span>
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
            <input
              inputMode="numeric"
              value={statusCode}
              onChange={(e) => setStatusCode(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="401"
            />
          </label>
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Endpoint</span>
            <input
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="GET /demo/protected 或 endpoint_id"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">API Key ID</span>
            <input
              value={apiKeyId}
              onChange={(e) => setApiKeyId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="uuid"
            />
          </label>
          <label className="grid gap-1 lg:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">User ID</span>
            <input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="uuid"
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {query.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {query.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">載入失敗</div>
        ) : null}
        {query.isSuccess ? <UsageLogTable logs={query.data} /> : null}
      </section>
    </div>
  );
}
