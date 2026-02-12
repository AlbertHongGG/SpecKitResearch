'use client';

import Link from 'next/link';
import { useSession } from '../features/auth/use-session';

export function Header() {
  const { user, logout } = useSession();
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Course Platform
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/courses">課程列表</Link>
          {!user && (
            <>
              <Link href="/login">登入</Link>
              <Link href="/register">註冊</Link>
            </>
          )}
          {user && (
            <>
              <Link href="/my-courses">我的課程</Link>
              {user.role === 'instructor' && <Link href="/instructor/courses">教師課程管理</Link>}
              {user.role === 'admin' && <Link href="/admin/review">管理後台</Link>}
              <button className="text-red-600" onClick={logout}>
                登出
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
