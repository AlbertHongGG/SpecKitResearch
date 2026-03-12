'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createAdminScopeRule,
  deleteAdminScopeRule,
  fetchAdminEndpoints,
  fetchAdminScopeRules,
  fetchAdminScopes,
} from '@/features/admin/admin.queries';

export default function AdminScopeRulesPage() {
  const qc = useQueryClient();

  const scopesQuery = useQuery({ queryKey: ['admin-scopes'], queryFn: fetchAdminScopes });
  const endpointsQuery = useQuery({ queryKey: ['admin-endpoints'], queryFn: () => fetchAdminEndpoints() });
  const rulesQuery = useQuery({ queryKey: ['admin-scope-rules'], queryFn: () => fetchAdminScopeRules() });

  const [scopeId, setScopeId] = useState('');
  const [endpointId, setEndpointId] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createAdminScopeRule({ scope_id: scopeId, endpoint_id: endpointId }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-scope-rules'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminScopeRule(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-scope-rules'] });
    },
  });

  const endpointOptions = useMemo(() => endpointsQuery.data ?? [], [endpointsQuery.data]);
  const scopeOptions = useMemo(() => scopesQuery.data ?? [], [scopesQuery.data]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scope Rules</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">把 scope 授權到特定 endpoint。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">新增規則</div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Scope</span>
            <select
              value={scopeId}
              onChange={(e) => setScopeId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            >
              <option value="">選擇 scope…</option>
              {scopeOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Endpoint</span>
            <select
              value={endpointId}
              onChange={(e) => setEndpointId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            >
              <option value="">選擇 endpoint…</option>
              {endpointOptions.map((e) => (
                <option key={e.id} value={e.id}>
                  {(e.service?.name ?? e.serviceId) + ' ' + e.method + ' ' + e.path}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !scopeId || !endpointId}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            建立
          </button>
          {createMutation.isError ? <span className="text-sm text-red-700 dark:text-red-200">建立失敗</span> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">列表</div>

        {rulesQuery.isLoading ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {rulesQuery.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            載入失敗
          </div>
        ) : null}

        {rulesQuery.isSuccess && rulesQuery.data.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">尚未建立任何規則。</div>
        ) : null}

        {rulesQuery.isSuccess && rulesQuery.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Scope</th>
                  <th className="py-2 pr-3">Endpoint</th>
                  <th className="py-2 pr-3">Effect</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {rulesQuery.data.map((r) => (
                  <tr key={r.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{r.scope?.name ?? r.scopeId}</td>
                    <td className="py-2 pr-3">
                      <span className="font-mono text-xs">
                        {(r.endpoint?.service?.name ?? '') + ' ' + (r.endpoint?.method ?? '') + ' ' + (r.endpoint?.path ?? '')}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{r.effect}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(r.id)}
                        disabled={deleteMutation.isPending}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        刪除
                      </button>
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
