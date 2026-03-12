"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

export function AdminHeader() {
  const router = useRouter();
  const { setSession } = useSession();

  const onLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setSession({ userId: undefined, isPlatformAdmin: false, organizationId: undefined });
    router.push('/login');
  };

  return (
    <header className="border-b bg-white">
      <div className="container-page flex items-center justify-between gap-4 text-sm">
        <nav className="flex gap-4">
          <Link href="/app">App</Link>
          <Link href="/admin">Admin Dashboard</Link>
          <Link href="/admin/plans">Plans</Link>
          <Link href="/admin/subscriptions">Subscriptions</Link>
          <Link href="/admin/metrics/revenue">Revenue Metrics</Link>
          <Link href="/admin/metrics/usage">Usage Ranking</Link>
          <Link href="/admin/risk">Risk Accounts</Link>
          <Link href="/admin/audit">Audit Log</Link>
        </nav>
        <button className="rounded border px-2 py-1 text-xs" onClick={onLogout}>Logout</button>
      </div>
    </header>
  );
}
