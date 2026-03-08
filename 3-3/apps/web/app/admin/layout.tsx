'use client';

import Link from 'next/link';
import * as React from 'react';
import { RequirePlatformAdmin } from '../../src/features/admin/requirePlatformAdmin';

export default function AdminLayout(props: { children: React.ReactNode }) {
  return (
    <RequirePlatformAdmin>
      <div className="min-h-screen bg-zinc-50">
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-sm font-semibold text-zinc-900">
                SB SSOT
              </Link>
              <nav className="flex items-center gap-3 text-sm text-zinc-600">
                <Link href="/admin" className="hover:text-zinc-900">
                  Dashboard
                </Link>
                <Link href="/admin/plans" className="hover:text-zinc-900">
                  Plans
                </Link>
                <Link href="/admin/overrides" className="hover:text-zinc-900">
                  Overrides
                </Link>
                <Link href="/admin/audit" className="hover:text-zinc-900">
                  Audit
                </Link>
              </nav>
            </div>

            <Link className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" href="/app">
              Back to App
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{props.children}</main>
      </div>
    </RequirePlatformAdmin>
  );
}
