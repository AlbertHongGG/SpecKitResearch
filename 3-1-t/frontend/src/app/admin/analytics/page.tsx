'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { fetchAdminAnalytics } from '@/services/admin/analytics/api';

export default function AdminAnalyticsPage() {
  const guard = useRolePageGuard('ADMIN');
  const { data } = useQuery({ queryKey: ['admin-analytics'], queryFn: fetchAdminAnalytics });
  const summary =
    (data as
      | { orders?: number; payments?: number; refunds?: number; disputes?: number }
      | undefined) ?? {};

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Analytics</h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link className="underline" href="/admin/seller-applications">
          Seller Applications
        </Link>
        <Link className="underline" href="/admin/categories">
          Categories
        </Link>
        <Link className="underline" href="/admin/orders">
          Orders
        </Link>
        <Link className="underline" href="/admin/refunds">
          Refunds
        </Link>
        <Link className="underline" href="/admin/disputes">
          Disputes
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        <li className="rounded border p-3">Orders: {summary.orders ?? 0}</li>
        <li className="rounded border p-3">Payments: {summary.payments ?? 0}</li>
        <li className="rounded border p-3">Refunds: {summary.refunds ?? 0}</li>
        <li className="rounded border p-3">Disputes: {summary.disputes ?? 0}</li>
      </ul>
    </main>
  );
}
