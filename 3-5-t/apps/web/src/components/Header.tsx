'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../lib/api-client';
import { useMe } from '../lib/require-auth';

export function Header() {
  const queryClient = useQueryClient();
  const me = useMe();

  const logout = useMutation({
    mutationFn: async () => {
      await apiFetch('/auth/logout', { method: 'POST', json: {} });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      await queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const user = me.data?.user ?? null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link href="/" className="text-lg font-semibold">
          Trello Lite
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/projects" className="text-sm text-slate-700 hover:text-slate-900">
                專案
              </Link>
              <span className="text-sm text-slate-600">{user.displayName}</span>
              <button
                type="button"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                onClick={() => logout.mutate()}
                disabled={logout.isPending}
              >
                登出
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900">
                登入
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                註冊
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
