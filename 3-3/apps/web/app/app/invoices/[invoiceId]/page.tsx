'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import * as React from 'react';
import { AsyncState } from '../../../../src/components/AsyncState';
import { apiFetch } from '../../../../src/lib/api';

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

type InvoiceLineItem = {
  type: 'RECURRING' | 'PRORATION' | 'OVERAGE' | 'TAX';
  description: string;
  amountCents: number;
  quantity: number | null;
  meterCode: string | null;
};

type InvoiceDetailResponse = {
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
};

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function InvoiceDetailPage() {
  const params = useParams<{ invoiceId: string }>();
  const invoiceId = params.invoiceId;

  const q = useQuery({
    queryKey: ['app', 'invoice', invoiceId],
    queryFn: () => apiFetch<InvoiceDetailResponse>(`/app/billing/invoices/${encodeURIComponent(invoiceId)}`),
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Invoice</h1>
          <p className="mt-1 text-sm text-zinc-600">Details and line items.</p>
        </div>
        <Link className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" href="/app/invoices">
          Back
        </Link>
      </div>

      <div className="mt-6">
        <AsyncState isLoading={q.isLoading} error={q.error}>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-zinc-900">{q.data ? formatMoney(q.data.invoice.totalCents, q.data.invoice.currency) : null}</div>
                  <div className="mt-1 text-xs text-zinc-500">{q.data?.invoice.id}</div>
                </div>
                <div className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-700">
                  {q.data?.invoice.status}
                </div>
              </div>

              <div className="mt-4 text-sm text-zinc-600">
                Period: {q.data ? new Date(q.data.invoice.billingPeriod.start).toLocaleString() : null} →{' '}
                {q.data ? new Date(q.data.invoice.billingPeriod.end).toLocaleString() : null}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">Line items</div>
              <div className="mt-3 divide-y divide-zinc-100">
                {(q.data?.lineItems ?? []).map((li, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{li.description}</div>
                      <div className="mt-1 text-xs text-zinc-500">
                        {li.type}
                        {li.meterCode ? ` • ${li.meterCode}` : ''}
                        {li.quantity != null ? ` • qty ${li.quantity}` : ''}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-zinc-900">{q.data ? formatMoney(li.amountCents, q.data.invoice.currency) : null}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
