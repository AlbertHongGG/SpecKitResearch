'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { fetchAdminRateLimitPolicy, updateAdminRateLimitPolicy } from '@/features/admin/admin.queries';

export default function AdminRateLimitPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-rate-limit'], queryFn: fetchAdminRateLimitPolicy });

  const [defaultPerMinute, setDefaultPerMinute] = useState(60);
  const [defaultPerHour, setDefaultPerHour] = useState(1000);
  const [capPerMinute, setCapPerMinute] = useState(600);
  const [capPerHour, setCapPerHour] = useState(10000);

  useEffect(() => {
    if (!query.data) return;
    setDefaultPerMinute(query.data.default_per_minute);
    setDefaultPerHour(query.data.default_per_hour);
    setCapPerMinute(query.data.cap_per_minute);
    setCapPerHour(query.data.cap_per_hour);
  }, [query.data]);

  const mutation = useMutation({
    mutationFn: () =>
      updateAdminRateLimitPolicy({
        default_per_minute: defaultPerMinute,
        default_per_hour: defaultPerHour,
        cap_per_minute: capPerMinute,
        cap_per_hour: capPerHour,
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-rate-limit'] });
    },
  });

  const isInvalid = defaultPerMinute > capPerMinute || defaultPerHour > capPerHour;

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rate Limit Policy</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">設定全域 default 與 cap（developer per-key override 不可超過 cap）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        {query.isLoading ? <div className="text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {query.isError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">載入失敗</div>
        ) : null}

        {query.isSuccess ? (
          <div className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Default / minute</span>
                <input
                  type="number"
                  value={defaultPerMinute}
                  onChange={(e) => setDefaultPerMinute(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Default / hour</span>
                <input
                  type="number"
                  value={defaultPerHour}
                  onChange={(e) => setDefaultPerHour(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Cap / minute</span>
                <input
                  type="number"
                  value={capPerMinute}
                  onChange={(e) => setCapPerMinute(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">Cap / hour</span>
                <input
                  type="number"
                  value={capPerHour}
                  onChange={(e) => setCapPerHour(Number(e.target.value))}
                  className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
                />
              </label>
            </div>

            {isInvalid ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                Default 不可超過 cap。
              </div>
            ) : null}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending || isInvalid}
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
              >
                儲存
              </button>
              {mutation.isError ? <span className="text-sm text-red-700 dark:text-red-200">更新失敗</span> : null}
              {query.data?.updated_at ? (
                <span className="text-sm text-zinc-600 dark:text-zinc-400">最後更新：{new Date(query.data.updated_at).toLocaleString()}</span>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
