'use client';

import Link from 'next/link';
import { useSession, logout } from '@/features/auth/api';

export function Header() {
  const { data, isLoading, error, refetch } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-semibold">
          Dynamic Survey
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {isLoading ? (
            <span className="text-gray-500">Loading…</span>
          ) : error ? (
            <span className="text-red-700">Session error</span>
          ) : data?.user ? (
            <UserNav
              username={data.user.username}
              csrfToken={data.csrf_token}
              onLoggedOut={() => refetch()}
            />
          ) : (
            <GuestNav />
          )}
        </nav>
      </div>
    </header>
  );
}

function GuestNav() {
  return (
    <>
      <Link href="/login" className="rounded border px-3 py-1">
        Login
      </Link>
    </>
  );
}

function UserNav({
  username,
  csrfToken,
  onLoggedOut
}: {
  username: string;
  csrfToken?: string;
  onLoggedOut: () => void;
}) {
  return (
    <>
      <Link href="/surveys" className="rounded border px-3 py-1">
        Surveys
      </Link>
      <span className="text-gray-600">{username}</span>
      <button
        className="rounded border px-3 py-1"
        onClick={async () => {
          if (!csrfToken) return;
          await logout(csrfToken);
          onLoggedOut();
        }}
      >
        Logout
      </button>
    </>
  );
} 
