'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useMe } from '../../../src/features/auth/useMe';
import { InvoiceCard } from '../../../src/features/billing/InvoiceCard';
import { UpgradeDowngradeModal } from '../../../src/features/subscription/UpgradeDowngradeModal';
import { apiFetch } from '../../../src/lib/api';

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

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const me = useMe();
  const orgId = me.data?.currentOrganization?.id;
  const memberRole = me.data?.currentOrganization?.memberRole;
  const canManage = memberRole === 'ORG_ADMIN';

  const subscription = useQuery({
    queryKey: ['app', 'subscription', orgId],
    enabled: Boolean(orgId),
    queryFn: () => apiFetch<SubscriptionSummaryResponse>('/app/subscription', { orgId }),
  });

  const invoices = useQuery({
    queryKey: ['app', 'invoices', orgId],
    enabled: Boolean(orgId),
    queryFn: () => apiFetch<{ invoices: Invoice[] }>('/app/billing/invoices', { orgId }),
  });

  const plansMonthly = useQuery({
    queryKey: ['pricing', 'plans', 'monthly'],
    queryFn: () => apiFetch<{ plans: PlanPublic[] }>('/pricing/plans?billingCycle=monthly', { csrf: false }),
  });
  const plansYearly = useQuery({
    queryKey: ['pricing', 'plans', 'yearly'],
    queryFn: () => apiFetch<{ plans: PlanPublic[] }>('/pricing/plans?billingCycle=yearly', { csrf: false }),
  });

  const [modal, setModal] = React.useState<{ open: boolean; mode: 'upgrade' | 'downgrade' } | null>(null);

  const cancel = useMutation({
    mutationFn: async () =>
      apiFetch<{ subscription: SubscriptionSummaryResponse }>('/app/subscription/cancel', { method: 'POST', orgId }),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['app', 'subscription', orgId] }),
        qc.invalidateQueries({ queryKey: ['app', 'dashboard', orgId] }),
      ]);
    },
  });

  if (me.isLoading) return <div className="text-sm text-zinc-600">Loading…</div>;
  if (me.error) return <div className="text-sm text-zinc-600">Not signed in.</div>;
  if (!orgId) return <div className="text-sm text-zinc-600">No active organization selected.</div>;

  const allPlans = [...(plansMonthly.data?.plans ?? []), ...(plansYearly.data?.plans ?? [])];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Subscription</h1>
            <p className="mt-1 text-sm text-zinc-600">Manage upgrades, downgrades and cancellation.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50"
              disabled={!canManage || subscription.isLoading || Boolean(subscription.error)}
              onClick={() => setModal({ open: true, mode: 'upgrade' })}
            >
              Upgrade
            </button>
            <button
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 disabled:opacity-50"
              disabled={!canManage || subscription.isLoading || Boolean(subscription.error)}
              onClick={() => setModal({ open: true, mode: 'downgrade' })}
            >
              Downgrade
            </button>
            <button
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canManage || cancel.isPending}
              onClick={() => {
                if (!confirm('Cancel this subscription?')) return;
                cancel.mutate();
              }}
            >
              Cancel
            </button>
          </div>
        </div>

        {!canManage ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
            Your role is <span className="font-medium">{memberRole}</span>. Only <span className="font-medium">ORG_ADMIN</span> can manage subscription changes.
          </div>
        ) : null}

        {subscription.isLoading ? <div className="mt-6 text-sm text-zinc-600">Loading subscription…</div> : null}
        {subscription.error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {(subscription.error as Error).message}
          </div>
        ) : null}

        {subscription.data ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">Current</div>
              <div className="mt-1 text-base font-semibold text-zinc-900">{subscription.data.plan.name}</div>
              <div className="mt-1 text-sm text-zinc-600">
                {subscription.data.status} • {subscription.data.billingCycle}
              </div>
              {subscription.data.pendingChange ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  Pending change: plan <span className="font-medium">{subscription.data.pendingChange.pendingPlanId}</span> effective{' '}
                  {new Date(subscription.data.pendingChange.effectiveAt).toLocaleString()}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-200 p-4">
              <div className="text-xs font-medium uppercase text-zinc-500">Entitlements</div>
              <div className="mt-2 text-sm text-zinc-700">
                {subscription.data.entitlements.statusReason ? (
                  <span className="text-zinc-500">{subscription.data.entitlements.statusReason}</span>
                ) : (
                  <span>OK</span>
                )}
              </div>
              <div className="mt-2 text-xs text-zinc-500">
                Features:{' '}
                {
                  Object.entries(subscription.data.entitlements.features)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .slice(0, 8)
                    .join(', ') || '—'
                }
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-zinc-900">Invoices</h2>
        {invoices.isLoading ? <div className="mt-3 text-sm text-zinc-600">Loading invoices…</div> : null}
        {invoices.error ? (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {(invoices.error as Error).message}
          </div>
        ) : null}
        <div className="mt-3 grid gap-3">
          {(invoices.data?.invoices ?? []).length === 0 ? (
            <div className="text-sm text-zinc-600">No invoices yet.</div>
          ) : (
            (invoices.data?.invoices ?? []).map((inv) => <InvoiceCard key={inv.id} invoice={inv} orgId={orgId} />)
          )}
        </div>
      </section>

      {subscription.data ? (
        <UpgradeDowngradeModal
          open={Boolean(modal?.open)}
          mode={modal?.mode ?? 'upgrade'}
          orgId={orgId}
          subscription={subscription.data}
          plans={allPlans}
          onClose={() => setModal(null)}
          onDone={async () => {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ['app', 'subscription', orgId] }),
              qc.invalidateQueries({ queryKey: ['app', 'dashboard', orgId] }),
              qc.invalidateQueries({ queryKey: ['app', 'invoices', orgId] }),
            ]);
          }}
        />
      ) : null}
    </div>
  );
}
