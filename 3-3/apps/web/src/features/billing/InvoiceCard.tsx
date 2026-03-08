'use client';

import * as React from 'react';
import { SimulatePaymentButtons } from './SimulatePaymentButtons';

type Invoice = {
  id: string;
  status: 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';
  billingPeriod: { start: string; end: string };
  totalCents: number;
  currency: string;
  dueAt?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
  createdAt: string;
};

function formatMoney(totalCents: number, currency: string): string {
  const amount = totalCents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function statusBadge(status: Invoice['status']): { label: string; className: string } {
  switch (status) {
    case 'Paid':
      return { label: 'Paid', className: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'Open':
      return { label: 'Open', className: 'bg-amber-50 text-amber-900 border-amber-200' };
    case 'Failed':
      return { label: 'Failed', className: 'bg-red-50 text-red-800 border-red-200' };
    case 'Voided':
      return { label: 'Voided', className: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
    case 'Draft':
    default:
      return { label: 'Draft', className: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
  }
}

export function InvoiceCard(props: { invoice: Invoice; orgId: string }) {
  const { invoice } = props;
  const badge = statusBadge(invoice.status);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-zinc-900">Invoice</div>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            <span className="font-mono">{invoice.id}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-zinc-900">{formatMoney(invoice.totalCents, invoice.currency)}</div>
          <div className="mt-1 text-xs text-zinc-500">Created {new Date(invoice.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 text-xs text-zinc-600 md:grid-cols-2">
        <div>
          Period: {new Date(invoice.billingPeriod.start).toLocaleDateString()} →{' '}
          {new Date(invoice.billingPeriod.end).toLocaleDateString()}
        </div>
        <div className="md:text-right">
          {invoice.dueAt ? <span>Due {new Date(invoice.dueAt).toLocaleString()}</span> : <span />}
          {invoice.paidAt ? <span>Paid {new Date(invoice.paidAt).toLocaleString()}</span> : null}
          {invoice.failedAt ? <span>Failed {new Date(invoice.failedAt).toLocaleString()}</span> : null}
        </div>
      </div>

      {invoice.status === 'Open' || invoice.status === 'Failed' ? (
        <div className="mt-4">
          <div className="text-xs font-medium uppercase text-zinc-500">Dev tools</div>
          <div className="mt-2">
            <SimulatePaymentButtons orgId={props.orgId} invoiceId={invoice.id} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
