import Link from 'next/link';

import type { SessionUser } from '@/lib/auth/session';

import { LogoutButton } from './LogoutButton';
import { NavLinks } from './NavLinks';

export default function Header({ session }: { session: SessionUser | null }) {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            API Platform
          </Link>
          <NavLinks role={session?.role ?? null} />
        </div>

        <div className="flex items-center gap-3 text-sm">
          {!session ? (
            <>
              <Link className="rounded px-2 py-1 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900" href="/login">
                登入
              </Link>
              <Link className="rounded bg-zinc-900 px-3 py-1.5 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200" href="/register">
                註冊
              </Link>
            </>
          ) : (
            <>
              <span className="hidden text-zinc-600 dark:text-zinc-400 sm:inline">{session.email}</span>
              <LogoutButton />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
