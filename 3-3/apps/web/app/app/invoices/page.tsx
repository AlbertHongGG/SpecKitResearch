'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';
import { AsyncState } from '../../../src/components/AsyncState';
import { apiFetch } from '../../../src/lib/api';

type Invoice = {
  id: string;
  status: 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';
  billingPeriod: { start: string; end: string };
  totalCents: number;
  currency: string;
  dueAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
};

type InvoicesResponse = { invoices: Invoice[] };

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function InvoicesPage() {
  const [status, setStatus] = React.useState<string>('');

  const q = useQuery({
    queryKey: ['app', 'invoices', { status }],
    queryFn: () =>
      apiFetch<InvoicesResponse>(status ? `/app/billing/invoices?status=${encodeURIComponent(status)}` : '/app/billing/invoices'),
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Invoices</h1>
          <p className="mt-1 text-sm text-zinc-600">Your organization’s invoices.</p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-zinc-600">Status</label>
          <select
            className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="Draft">Draft</option>
            <option value="Open">Open</option>
            <option value="Paid">Paid</option>
            <option value="Failed">Failed</option>
            <option value="Voided">Voided</option>
          </select>
        </div>
      </div>

      <div className="mt-6">
        <AsyncState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={!q.isLoading && !q.error && (q.data?.invoices?.length ?? 0) === 0}
          empty="No invoices found."
        >
          <div className="grid grid-cols-1 gap-3">
            {(q.data?.invoices ?? []).map((inv) => (
              <Link
                key={inv.id}
                href={`/app/invoices/${inv.id}`}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:border-zinc-300"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{formatMoney(inv.totalCents, inv.currency)}</div>
                    <div className="mt-1 text-xs text-zinc-500">{inv.id}</div>
                  </div>
                  <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
                    {inv.status}
                  </div>
                </div>

                <div className="mt-3 text-sm text-zinc-600">
                  Period: {new Date(inv.billingPeriod.start).toLocaleDateString()} →{' '}
                  {new Date(inv.billingPeriod.end).toLocaleDateString()}
                </div>
              </Link>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
