'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import {
  createAdminService,
  fetchAdminServices,
  updateAdminService,
  type AdminService,
} from '@/features/admin/admin.queries';

export default function AdminServicesPage() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const query = useQuery({
    queryKey: ['admin-services'],
    queryFn: fetchAdminServices,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminService({
        name: name.trim(),
        description: description.trim(),
        status: 'active',
      }),
    onSuccess: async () => {
      setName('');
      setDescription('');
      await qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (service: AdminService) =>
      updateAdminService(service.id, {
        status: service.status === 'active' ? 'disabled' : 'active',
      }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-services'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Services</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">管理 API Services（啟用/停用）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">新增 Service</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="payments"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Description</span>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="Payment APIs"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !name.trim() || !description.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            建立
          </button>
          {createMutation.isError ? (
            <span className="text-sm text-red-700 dark:text-red-200">建立失敗</span>
          ) : null}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">列表</div>

        {query.isLoading ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">載入中…</div> : null}

        {query.isError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            載入失敗
          </div>
        ) : null}

        {query.isSuccess && query.data.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">尚未建立任何 service。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="py-2 pr-3">{s.description}</td>
                    <td className="py-2 pr-3">{s.status}</td>
                    <td className="py-2 pr-3">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => toggleMutation.mutate(s)}
                        disabled={toggleMutation.isPending}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        {s.status === 'active' ? '停用' : '啟用'}
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
