'use client';

import Link from 'next/link';
import * as React from 'react';
import { useMe } from '../../src/features/auth/useMe';
import { OrgSwitcher } from '../../src/features/org/OrgSwitcher';

export default function AppLayout(props: { children: React.ReactNode }) {
  const me = useMe();
  const org = me.data?.currentOrganization ?? null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-zinc-900">
              SB SSOT
            </Link>
            <nav className="flex items-center gap-3 text-sm text-zinc-600">
              <Link href="/pricing" className="hover:text-zinc-900">
                Pricing
              </Link>
              <Link href="/app" className="hover:text-zinc-900">
                Dashboard
              </Link>
              <Link href="/app/subscription" className="hover:text-zinc-900">
                Subscription
              </Link>
              <Link href="/app/usage" className="hover:text-zinc-900">
                Usage
              </Link>
              <Link href="/app/invoices" className="hover:text-zinc-900">
                Invoices
              </Link>
              <Link href="/app/billing/payment-methods" className="hover:text-zinc-900">
                Payment
              </Link>
              <Link href="/app/org/members" className="hover:text-zinc-900">
                Members
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <OrgSwitcher />
            <div className="text-xs text-zinc-600">
              {me.isLoading ? 'Loading user…' : null}
              {me.error ? 'Not signed in' : null}
              {org ? <span className="font-medium text-zinc-900">{me.data?.user.email}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{props.children}</main>
    </div>
  );
}
