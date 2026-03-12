'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { disableAdminUser, fetchAdminUsers, type AdminUserRow } from '@/features/admin/admin.queries';

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');

  const query = useQuery({
    queryKey: ['admin-users', { q }],
    queryFn: () => fetchAdminUsers({ q: q.trim() || undefined }),
  });

  const disableMutation = useMutation({
    mutationFn: (userId: string) => disableAdminUser(userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">搜尋並停用使用者（停用後 session + keys 立即失效）。</p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="grid gap-1">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">Search (email contains)</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-black"
            placeholder="user@example.com"
          />
        </label>
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
          <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">沒有符合條件的 users。</div>
        ) : null}

        {query.isSuccess && query.data.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-zinc-600 dark:text-zinc-400">
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Last login</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {query.data.map((u: AdminUserRow) => (
                  <tr key={u.user_id} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
                    <td className="py-2 pr-3 font-medium">{u.email}</td>
                    <td className="py-2 pr-3">{u.role}</td>
                    <td className="py-2 pr-3">{u.status}</td>
                    <td className="py-2 pr-3">{new Date(u.created_at).toLocaleString()}</td>
                    <td className="py-2 pr-3">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '-'}</td>
                    <td className="py-2 pr-3">
                      <button
                        type="button"
                        onClick={() => {
                          if (!confirm('確定要停用此使用者？')) return;
                          disableMutation.mutate(u.user_id);
                        }}
                        disabled={disableMutation.isPending || u.status === 'disabled'}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                      >
                        停用
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
