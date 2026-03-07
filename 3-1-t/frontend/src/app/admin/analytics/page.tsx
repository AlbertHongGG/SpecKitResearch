'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchAdminAnalytics } from '@/services/admin/analytics/api';

export default function AdminAnalyticsPage() {
  const { data } = useQuery({ queryKey: ['admin-analytics'], queryFn: fetchAdminAnalytics });
  const summary =
    (data as
      | { orders?: number; payments?: number; refunds?: number; disputes?: number }
      | undefined) ?? {};

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Analytics</h1>
      <ul className="grid gap-2 sm:grid-cols-2">
        <li className="rounded border p-3">Orders: {summary.orders ?? 0}</li>
        <li className="rounded border p-3">Payments: {summary.payments ?? 0}</li>
        <li className="rounded border p-3">Refunds: {summary.refunds ?? 0}</li>
        <li className="rounded border p-3">Disputes: {summary.disputes ?? 0}</li>
      </ul>
    </main>
  );
}
