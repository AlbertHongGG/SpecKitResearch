'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import * as React from 'react';
import { apiFetch } from '../../src/lib/api';

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

function formatPrice(plan: PlanPublic): string {
  const amount = plan.priceCents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: plan.currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${plan.currency}`;
  }
}

function PlanCard(props: { plan: PlanPublic }) {
  const { plan } = props;
  const featureList = Object.entries(plan.features).filter(([, v]) => v);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-lg font-semibold text-zinc-900">{plan.name}</div>
          <div className="text-sm text-zinc-500">{plan.billingCycle}</div>
        </div>
        {!plan.isActive ? (
          <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600">inactive</span>
        ) : null}
      </div>

      <div className="mt-4 text-3xl font-semibold text-zinc-900">{formatPrice(plan)}</div>
      <div className="mt-1 text-sm text-zinc-500">per {plan.billingCycle === 'monthly' ? 'month' : 'year'}</div>

      <div className="mt-4">
        <div className="text-sm font-medium text-zinc-700">Features</div>
        {featureList.length === 0 ? (
          <div className="mt-2 text-sm text-zinc-500">No feature flags enabled.</div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {featureList.slice(0, 8).map(([k]) => (
              <li key={k}>• {k}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function PricingPage() {
  const monthly = useQuery({
    queryKey: ['pricing', 'plans', 'monthly'],
    queryFn: () => apiFetch<{ plans: PlanPublic[] }>('/pricing/plans?billingCycle=monthly', { csrf: false }),
  });

  const yearly = useQuery({
    queryKey: ['pricing', 'plans', 'yearly'],
    queryFn: () => apiFetch<{ plans: PlanPublic[] }>('/pricing/plans?billingCycle=yearly', { csrf: false }),
  });

  const isLoading = monthly.isLoading || yearly.isLoading;
  const error = (monthly.error as Error | null) ?? (yearly.error as Error | null);

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Pricing</h1>
            <p className="mt-1 text-sm text-zinc-600">Public plan list from the API.</p>
          </div>
          <div className="flex gap-2">
            <Link className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm" href="/">
              Home
            </Link>
            <Link className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white" href="/app">
              App
            </Link>
          </div>
        </div>

        {isLoading ? <div className="mt-8 text-sm text-zinc-600">Loading…</div> : null}
        {error ? (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error.message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-8">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Monthly</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(monthly.data?.plans ?? []).map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900">Yearly</h2>
            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
              {(yearly.data?.plans ?? []).map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
