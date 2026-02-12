'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

import { queryKeys } from '@/lib/queryKeys';
import { authClient } from '@/services/authClient';

export default function NavBar() {
  const { data: me } = useQuery({ queryKey: queryKeys.me(), queryFn: authClient.me });

  return (
    <header className="border-b border-slate-200">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold text-slate-900">
          課程平台
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/courses">課程</Link>
          {me?.user ? <Link href="/my-courses">我的課程</Link> : null}
          {me?.user?.role === 'instructor' || me?.user?.role === 'admin' ? (
            <Link href="/instructor/courses">教師</Link>
          ) : null}
          {me?.user?.role === 'admin' ? <Link href="/admin/reviews">管理</Link> : null}

          {me?.user ? (
            <button
              className="rounded-md border border-slate-300 px-3 py-1.5"
              onClick={async () => {
                await authClient.logout();
                window.location.href = '/';
              }}
            >
              登出
            </button>
          ) : (
            <Link className="rounded-md border border-slate-300 px-3 py-1.5" href="/login">
              登入
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
