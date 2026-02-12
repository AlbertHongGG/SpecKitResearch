'use client';

import Link from 'next/link';

import { useSession } from '../hooks/useSession';
import { Button } from './Button';
import { apiFetch } from '../lib/apiClient';

export function NavBar() {
  const sessionQuery = useSession();
  const session = sessionQuery.data?.session;

  async function logout() {
    await apiFetch('/api/auth/logout', { method: 'POST' });
    await sessionQuery.refetch();
  }

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-semibold">
            CCP
          </Link>
          <Link href="/courses" className="text-sm text-slate-700 hover:text-slate-900">
            課程
          </Link>
          {session?.role === 'student' ? (
            <Link href="/my-courses" className="text-sm text-slate-700 hover:text-slate-900">
              我的課程
            </Link>
          ) : null}
          {session?.role === 'instructor' ? (
            <Link href="/instructor/courses" className="text-sm text-slate-700 hover:text-slate-900">
              講師後台
            </Link>
          ) : null}
          {session?.role === 'admin' ? (
            <Link href="/admin/review" className="text-sm text-slate-700 hover:text-slate-900">
              管理後台
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {sessionQuery.isLoading ? (
            <span className="text-sm text-slate-500">載入中…</span>
          ) : session ? (
            <Button type="button" variant="secondary" onClick={logout}>
              登出
            </Button>
          ) : (
            <>
              <Link href="/login" className="text-sm text-slate-700 hover:text-slate-900">
                登入
              </Link>
              <Link href="/register" className="text-sm text-slate-700 hover:text-slate-900">
                註冊
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
