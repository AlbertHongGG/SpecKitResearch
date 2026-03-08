'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';
import { useMe } from '../../src/features/auth/useMe';
import { apiFetch } from '../../src/lib/api';
import { InvoiceCard } from '../../src/features/billing/InvoiceCard';

type PlanPublic = {
  id: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  priceCents: number;
  currency: string;
  isActive: boolean;
  limits: Record<string, unknown>;
  features: Record<string, boolean>;
};

type SubscriptionSummaryResponse = {
  status: 'Trial' | 'Active' | 'PastDue' | 'Suspended' | 'Canceled' | 'Expired';
  billingCycle: 'monthly' | 'yearly';
  plan: PlanPublic;
  currentPeriod: { start: string; end: string };
  trialEndAt?: string | null;
  gracePeriodEndAt?: string | null;
  pendingChange?: { pendingPlanId: string; effectiveAt: string };
  entitlements: { features: Record<string, boolean>; limits: Record<string, unknown>; statusReason?: string };
};

type UsageMeterItem = {
  code: 'API_CALLS' | 'STORAGE_BYTES' | 'USER_COUNT' | 'PROJECT_COUNT';
  name: string;
  unit: string;
  value: number;
  limit?: number | null;
  policy: 'block' | 'throttle' | 'overage';
  status: 'ok' | 'nearLimit' | 'overLimit';
  resetAt: string;
};

type DashboardResponse = {
  subscription: SubscriptionSummaryResponse;
  usage: { meters: UsageMeterItem[] };
  recentInvoices: Array<{
    id: string;
    status: 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';
    billingPeriod: { start: string; end: string };
    totalCents: number;
    currency: string;
    dueAt?: string | null;
    paidAt?: string | null;
    failedAt?: string | null;
    createdAt: string;
  }>;
};

export default function DashboardPage() {
  const me = useMe();
  const orgId = me.data?.currentOrganization?.id;

  const dashboard = useQuery({
    queryKey: ['app', 'dashboard', orgId],
    enabled: Boolean(orgId),
    queryFn: () => apiFetch<DashboardResponse>('/app/dashboard', { orgId }),
  });

  if (me.isLoading) {
    return <div className="text-sm text-zinc-600">Loading…</div>;
  }

  if (me.error) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="text-lg font-semibold text-zinc-900">Not signed in</div>
        <p className="mt-2 text-sm text-zinc-600">Use the API auth endpoints to create a session.</p>
        <div className="mt-4">
          <Link className="text-sm font-medium text-zinc-900 underline" href="/pricing">
            View pricing
          </Link>
        </div>
      </div>
    );
  }

  if (!orgId) {
    return <div className="text-sm text-zinc-600">No active organization selected.</div>;
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Dashboard</h1>
            <p className="mt-1 text-sm text-zinc-600">Subscription, usage and recent invoices.</p>
          </div>
          <Link className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white" href="/app/subscription">
            Manage subscription
          </Link>
        </div>

        {dashboard.isLoading ? <div className="mt-6 text-sm text-zinc-600">Loading dashboard…</div> : null}
        {dashboard.error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {(dashboard.error as Error).message}
          </div>
        ) : null}

        {dashboard.data ? (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">Plan</div>
              <div className="mt-1 text-base font-semibold text-zinc-900">{dashboard.data.subscription.plan.name}</div>
              <div className="mt-1 text-sm text-zinc-600">
                {dashboard.data.subscription.status} • {dashboard.data.subscription.billingCycle}
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">Period</div>
              <div className="mt-1 text-sm text-zinc-700">
                {new Date(dashboard.data.subscription.currentPeriod.start).toLocaleString()} →{' '}
                {new Date(dashboard.data.subscription.currentPeriod.end).toLocaleString()}
              </div>
              {dashboard.data.subscription.gracePeriodEndAt ? (
                <div className="mt-1 text-xs text-zinc-500">
                  Grace until {new Date(dashboard.data.subscription.gracePeriodEndAt).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">Entitlements</div>
              <div className="mt-1 text-sm text-zinc-700">
                {dashboard.data.subscription.entitlements.statusReason ? (
                  <span className="text-zinc-500">{dashboard.data.subscription.entitlements.statusReason}</span>
                ) : (
                  <span>OK</span>
                )}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Enabled features:{' '}
                {
                  Object.entries(dashboard.data.subscription.entitlements.features)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .slice(0, 4)
                    .join(', ') || '—'
                }
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Usage</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(dashboard.data?.usage.meters ?? []).map((m) => (
            <div key={m.code} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-900">{m.name}</div>
                  <div className="mt-1 text-xs text-zinc-500">{m.code}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-zinc-900">
                    {m.value} {m.unit}
                  </div>
                  <div className="mt-1 text-xs text-zinc-500">{m.status} • {m.policy}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-zinc-500">Reset: {new Date(m.resetAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Recent invoices</h2>
        <div className="mt-3 grid gap-3">
          {(dashboard.data?.recentInvoices ?? []).length === 0 ? (
            <div className="text-sm text-zinc-600">No invoices yet.</div>
          ) : (
            (dashboard.data?.recentInvoices ?? []).map((inv) => <InvoiceCard key={inv.id} invoice={inv} orgId={orgId} />)
          )}
        </div>
      </section>
    </div>
  );
}
