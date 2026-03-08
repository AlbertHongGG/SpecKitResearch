'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { ApiKeySettingsForm } from '@/features/api-keys/ApiKeySettingsForm';
import { RevokeApiKeyButton } from '@/features/api-keys/RevokeApiKeyButton';
import { RotateApiKeyWizard } from '@/features/api-keys/RotateApiKeyWizard';
import type { ApiKey } from '@/features/api-keys/api-keys.types';
import { UsageLogFilters, type UsageLogFiltersValue } from '@/features/usage/UsageLogFilters';
import { UsageLogTable } from '@/features/usage/UsageLogTable';
import { UsageStatsCards } from '@/features/usage/UsageStatsCards';
import {
  fetchUsageLogs,
  fetchUsageStats,
  usageLogsQueryKey,
  usageStatsQueryKey
} from '@/features/usage/usage.queries';
import { apiFetch, type ApiError, HttpError } from '@/services/http';

function getErrorMessage(err: unknown): string {
  if (err instanceof HttpError) {
    const body = err.body as ApiError | null;
    return body?.error?.message ?? `載入失敗（HTTP ${err.status}）`;
  }
  return '載入失敗';
}

function toLocalInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function KeyDetailPage() {
  const params = useParams<{ id: string }>();
  const apiKeyId = params.id;
  const [tab, setTab] = useState<'settings' | 'usage'>('settings');

  const keysQuery = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiFetch<ApiKey[]>('/api-keys')
  });

  const apiKey = keysQuery.data?.find((k) => k.api_key_id === apiKeyId);

  const defaultFilters = useMemo<UsageLogFiltersValue>(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    return { from: toLocalInput(from), to: toLocalInput(to), status_code: '', endpoint: '' };
  }, []);

  const [filters, setFilters] = useState<UsageLogFiltersValue>(defaultFilters);

  const usageParams = useMemo(() => {
    const from = new Date(filters.from);
    const to = new Date(filters.to);
    // `datetime-local` is minute-precision by default, so `to` becomes xx:yy:00.
    // Include the whole minute to avoid excluding events that happened within
    // the selected minute (e.g. xx:yy:13).
    to.setSeconds(59, 999);
    const statusCodeRaw = filters.status_code.trim();

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      status_code: statusCodeRaw ? Number(statusCodeRaw) : undefined,
      endpoint: filters.endpoint.trim() ? filters.endpoint.trim() : undefined
    };
  }, [filters]);

  const logsQuery = useQuery({
    enabled: tab === 'usage',
    queryKey: usageLogsQueryKey({
      from: usageParams.from,
      to: usageParams.to,
      status_code: usageParams.status_code,
      endpoint: usageParams.endpoint
    }),
    queryFn: () =>
      fetchUsageLogs({
        from: usageParams.from,
        to: usageParams.to,
        status_code: usageParams.status_code,
        endpoint: usageParams.endpoint
      })
  });

  const statsQuery = useQuery({
    enabled: tab === 'usage',
    queryKey: usageStatsQueryKey({ from: usageParams.from, to: usageParams.to, endpoint: usageParams.endpoint }),
    queryFn: () => fetchUsageStats({ from: usageParams.from, to: usageParams.to, endpoint: usageParams.endpoint })
  });

  const filteredLogs = useMemo(() => {
    const logs = logsQuery.data ?? [];
    return logs.filter((l) => l.api_key_id === apiKeyId);
  }, [logsQuery.data, apiKeyId]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/keys" className="underline-offset-4 hover:underline">
              ← 返回 Keys
            </Link>
          </div>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Key 詳情</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">管理此 key 的設定、撤銷、輪替，以及查看用量紀錄。</p>
        </div>
      </div>

      {keysQuery.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}

      {keysQuery.isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {getErrorMessage(keysQuery.error)}
        </div>
      ) : null}

      {keysQuery.isSuccess && !apiKey ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm text-zinc-600 dark:text-zinc-400">找不到此 API Key。</div>
        </div>
      ) : null}

      {apiKey ? (
        <>
          <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{apiKey.name}</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{apiKey.api_key_id}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                    狀態：{apiKey.status}
                  </span>
                  {apiKey.replaced_by_key_id ? (
                    <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                      replaced_by：{apiKey.replaced_by_key_id}
                    </span>
                  ) : null}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {apiKey.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <RotateApiKeyWizard apiKey={apiKey} />
                <RevokeApiKeyButton apiKey={apiKey} />
              </div>
            </div>
          </section>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === 'settings'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900'
              }`}
            >
              設定
            </button>
            <button
              type="button"
              onClick={() => setTab('usage')}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                tab === 'usage'
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'border border-zinc-300 bg-white hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:hover:bg-zinc-900'
              }`}
            >
              用量
            </button>
          </div>

          {tab === 'settings' ? <ApiKeySettingsForm apiKey={apiKey} /> : null}

          {tab === 'usage' ? (
            <div className="grid gap-4">
              <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-lg font-semibold">Filters</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      可用 endpoint_id、或 &quot;METHOD /path&quot;。
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilters(defaultFilters)}
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                  >
                    重設 filters
                  </button>
                </div>
                <div className="mt-4">
                  <UsageLogFilters value={filters} onChange={setFilters} disabled={logsQuery.isFetching} />
                </div>
              </section>

              {statsQuery.isLoading ? (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">統計載入中…</div>
              ) : null}
              {statsQuery.isError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                  {getErrorMessage(statsQuery.error)}
                </div>
              ) : null}
              {statsQuery.isSuccess ? (
                <>
                  <UsageStatsCards stats={statsQuery.data} />
                  <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    註：統計為此帳號在時間範圍內的總計（後端目前不提供 api_key_id 參數）。
                  </div>
                </>
              ) : null}

              <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-lg font-semibold">Usage Logs</div>
                  {logsQuery.isFetching ? <div className="text-sm text-zinc-600 dark:text-zinc-400">更新中…</div> : null}
                </div>

                {logsQuery.isLoading ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
                {logsQuery.isError ? (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
                    {getErrorMessage(logsQuery.error)}
                  </div>
                ) : null}
                {logsQuery.isSuccess ? (
                  <div className="mt-3">
                    <UsageLogTable logs={filteredLogs} />
                  </div>
                ) : null}
              </section>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
