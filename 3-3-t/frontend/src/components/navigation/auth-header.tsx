"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { OrganizationSwitcher } from './organization-switcher';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

export function AuthHeader({
  isOrgAdmin,
  organizations,
}: {
  isOrgAdmin?: boolean;
  organizations: { id: string; name: string }[];
}) {
  const router = useRouter();
  const { setSession } = useSession();

  const onLogout = async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setSession({ userId: undefined, isPlatformAdmin: false, organizationId: undefined });
    router.push('/login');
  };

  return (
    <header className="border-b bg-white">
      <div className="container-page flex items-center justify-between">
        <nav className="flex gap-4 text-sm">
          <Link href="/app">Dashboard</Link>
          <Link href="/app/subscription">Subscription</Link>
          <Link href="/app/usage">Usage</Link>
          <Link href="/app/billing/invoices">Invoices</Link>
          {isOrgAdmin ? <Link href="/app/billing/payment-methods">Payment Methods</Link> : null}
          {isOrgAdmin ? <Link href="/app/org/members">Members</Link> : null}
        </nav>
        <div className="flex items-center gap-2">
          <OrganizationSwitcher organizations={organizations} />
          <button className="rounded border px-2 py-1 text-xs" onClick={onLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
