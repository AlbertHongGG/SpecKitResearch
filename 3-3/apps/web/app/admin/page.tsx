'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { AsyncState } from '../../src/components/AsyncState';
import { apiFetch } from '../../src/lib/api';

type AdminDashboardResponse = {
  orgCount: number;
  userCount: number;
  activeSubscriptions: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
  expiredSubscriptions: number;
  openInvoices: number;
  revenueTotalCents: number;
};

function formatMoney(cents: number) {
  const amount = cents / 100;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(amount);
}

export default function AdminDashboardPage() {
  const q = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => apiFetch<AdminDashboardResponse>('/admin/dashboard'),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Admin dashboard</h1>
      <p className="mt-1 text-sm text-zinc-600">Platform-wide metrics.</p>

      <div className="mt-6">
        <AsyncState isLoading={q.isLoading} error={q.error}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs text-zinc-500">Organizations</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">{q.data?.orgCount}</div>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs text-zinc-500">Users</div>
              <div className="mt-1 text-2xl font-semibold text-zinc-900">{q.data?.userCount}</div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs text-zinc-500">Subscriptions</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-700">
                <div>Active: {q.data?.activeSubscriptions}</div>
                <div>PastDue: {q.data?.pastDueSubscriptions}</div>
                <div>Suspended: {q.data?.suspendedSubscriptions}</div>
                <div>Expired: {q.data?.expiredSubscriptions}</div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-xs text-zinc-500">Billing</div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-zinc-700">
                <div>Open invoices: {q.data?.openInvoices}</div>
                <div>Revenue total: {q.data ? formatMoney(q.data.revenueTotalCents) : '—'}</div>
              </div>
            </div>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
