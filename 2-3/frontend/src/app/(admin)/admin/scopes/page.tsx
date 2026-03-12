'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import {
  createAdminScope,
  fetchAdminScopes,
  updateAdminScope,
  type AdminScope,
} from '@/features/admin/admin.queries';

export default function AdminScopesPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['admin-scopes'], queryFn: fetchAdminScopes });

  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [editId, setEditId] = useState<string>('');
  const editScope = useMemo(() => query.data?.find((s) => s.id === editId) ?? null, [query.data, editId]);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const createMutation = useMutation({
    mutationFn: () => createAdminScope({ name: newName.trim(), description: newDescription.trim() }),
    onSuccess: async () => {
      setNewName('');
      setNewDescription('');
      await qc.invalidateQueries({ queryKey: ['admin-scopes'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: () => updateAdminScope(editId, { name: editName.trim(), description: editDescription.trim() }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-scopes'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Scopes</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">管理可授權的 scopes（例如 user:read）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold">新增 Scope</div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Name</span>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="user:read"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">Description</span>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              placeholder="Read user profile"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !newName.trim() || !newDescription.trim()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            建立
          </button>
          {createMutation.isError ? <span className="text-sm text-red-700 dark:text-red-200">建立失敗</span> : null}
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
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">尚未建立任何 scope。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((s) => (
                  <tr key={s.id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{s.name}</td>
                    <td className="py-2 pr-3">{s.description}</td>
                    <td className="py-2 pr-3">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => {
                          setEditId(s.id);
                          setEditName(s.name);
                          setEditDescription(s.description);
                        }}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {editScope ? (
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">編輯 Scope</div>
              <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">ID: {editScope.id}</div>
            </div>
            <button
              type="button"
              onClick={() => setEditId('')}
              className="rounded-lg px-3 py-1.5 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-900"
            >
              取消
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Name</span>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Description</span>
              <input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending || !editName.trim() || !editDescription.trim()}
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              儲存
            </button>
            {updateMutation.isError ? <span className="text-sm text-red-700 dark:text-red-200">更新失敗</span> : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
