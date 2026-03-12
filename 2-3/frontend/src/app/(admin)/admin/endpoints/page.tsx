'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createAdminEndpoint,
  fetchAdminEndpoints,
  fetchAdminServices,
  updateAdminEndpoint,
  type AdminEndpoint,
} from '@/features/admin/admin.queries';

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

export default function AdminEndpointsPage() {
  const qc = useQueryClient();

  const servicesQuery = useQuery({ queryKey: ['admin-services'], queryFn: fetchAdminServices });
  const endpointsQuery = useQuery({ queryKey: ['admin-endpoints'], queryFn: () => fetchAdminEndpoints() });

  const [serviceId, setServiceId] = useState<string>('');
  const [method, setMethod] = useState<(typeof METHODS)[number]>('GET');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminEndpoint(serviceId, {
        method,
        path: path.trim(),
        description: description.trim() || undefined,
        status: 'active',
      }),
    onSuccess: async () => {
      setPath('');
      setDescription('');
      await qc.invalidateQueries({ queryKey: ['admin-endpoints'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (endpoint: AdminEndpoint) =>
      updateAdminEndpoint(endpoint.id, {
        status: endpoint.status === 'active' ? 'disabled' : 'active',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-endpoints'] });
    },
  });

  const serviceOptions = useMemo(() => servicesQuery.data ?? [], [servicesQuery.data]);

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Endpoints</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">管理 Endpoints（service + method + path）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">新增 Endpoint</div>

        <div className="mt-3 grid gap-3 lg:grid-cols-4">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Service</span>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            >
              <option value="">選擇 service…</option>
              {serviceOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Method</span>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 lg:col-span-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Path</span>
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="/v1/payments"
            />
          </label>

          <label className="grid gap-1 lg:col-span-4">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Description (optional)</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="List payments"
            />
          </label>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !serviceId || !path.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            建立
          </button>
          {createMutation.isError ? <span className="text-sm text-red-700 dark:text-red-200">建立失敗</span> : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">列表</div>

        {endpointsQuery.isLoading ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}
        {endpointsQuery.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            載入失敗
          </div>
        ) : null}

        {endpointsQuery.isSuccess && endpointsQuery.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Service</th>
                  <th className="py-2 pr-3">Method</th>
                  <th className="py-2 pr-3">Path</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {endpointsQuery.data.map((e) => (
                  <tr key={e.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{e.service?.name ?? e.serviceId}</td>
                    <td className="py-2 pr-3">{e.method}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{e.path}</td>
                    <td className="py-2 pr-3">{e.status}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(e)}
                        disabled={toggleMutation.isPending}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        {e.status === 'active' ? '停用' : '啟用'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {endpointsQuery.isSuccess && endpointsQuery.data.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">尚未建立任何 endpoint。</div>
        ) : null}
      </section>
    </div>
  );
}
