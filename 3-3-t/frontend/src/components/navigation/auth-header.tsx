"use client";

import Link from 'next/link';
import { OrganizationSwitcher } from './organization-switcher';

export function AuthHeader({
  isOrgAdmin,
  organizations,
}: {
  isOrgAdmin?: boolean;
  organizations: { id: string; name: string }[];
}) {
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
        <OrganizationSwitcher organizations={organizations} />
      </div>
    </header>
  );
}
