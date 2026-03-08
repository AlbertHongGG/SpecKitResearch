'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  blockAdminApiKey,
  fetchAdminApiKeys,
  revokeAdminApiKey,
  type AdminApiKeyRow,
} from '@/features/admin/admin.queries';

export default function AdminKeysPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<string>('');

  const query = useQuery({
    queryKey: ['admin-api-keys', { q, status }],
    queryFn: () => fetchAdminApiKeys({ q: q.trim() || undefined, status: status || undefined }),
  });

  const blockMutation = useMutation({
    mutationFn: (apiKeyId: string) => blockAdminApiKey(apiKeyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (apiKeyId: string) => revokeAdminApiKey(apiKeyId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-api-keys'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Keys</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">搜尋與管理全站 API keys（封鎖/撤銷）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 sm:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Search</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="name / user id"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            >
              <option value="">All</option>
              <option value="active">active</option>
              <option value="revoked">revoked</option>
              <option value="blocked">blocked</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">結果</div>

        {query.isLoading ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {query.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            載入失敗
          </div>
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">沒有符合條件的 keys。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Scopes</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((k: AdminApiKeyRow) => (
                  <tr key={k.api_key_id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{k.name}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{k.user_id}</td>
                    <td className="py-2 pr-3">{k.status}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <span
                            key={s}
                            className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2 pr-3">{new Date(k.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm('確定要封鎖此 key？封鎖後會立即失效。')) return;
                            blockMutation.mutate(k.api_key_id);
                          }}
                          disabled={blockMutation.isPending || k.status === 'blocked'}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        >
                          封鎖
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!confirm('確定要撤銷此 key？撤銷後會立即失效。')) return;
                            revokeMutation.mutate(k.api_key_id);
                          }}
                          disabled={revokeMutation.isPending || k.status !== 'active'}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        >
                          撤銷
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>
    </div>
  );
}
