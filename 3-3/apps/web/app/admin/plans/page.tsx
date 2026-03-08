'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { z } from 'zod';
import { AsyncState } from '../../../src/components/AsyncState';
import { apiFetch } from '../../../src/lib/api';

type PlanAdmin = {
  id: string;
  name: string;
  billingCycle: 'monthly' | 'yearly';
  priceCents: number;
  currency: string;
  isActive: boolean;
  limits: Record<string, unknown>;
  features: Record<string, boolean>;
  createdAt: string;
  updatedAt: string;
};

type PlansResponse = { plans: PlanAdmin[] };

const upsertSchema = z.object({
  name: z.string().min(1),
  billingCycle: z.enum(['monthly', 'yearly']),
  priceCents: z.number().int().min(0),
  currency: z.string().min(1),
  isActive: z.boolean(),
  limits: z.record(z.string(), z.unknown()),
  features: z.record(z.string(), z.boolean()),
});

type Upsert = z.infer<typeof upsertSchema>;

function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export default function AdminPlansPage() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: () => apiFetch<PlansResponse>('/admin/plans'),
  });

  const create = useMutation({
    mutationFn: async (input: Upsert) => {
      const parsed = upsertSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.message);
      return apiFetch<PlanAdmin>('/admin/plans', { method: 'POST', body: JSON.stringify(parsed.data) });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });

  const update = useMutation({
    mutationFn: async (input: { planId: string; data: Upsert }) => {
      const parsed = upsertSchema.safeParse(input.data);
      if (!parsed.success) throw new Error(parsed.error.message);
      return apiFetch<PlanAdmin>(`/admin/plans/${encodeURIComponent(input.planId)}`, {
        method: 'PUT',
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });

  const [form, setForm] = React.useState<Upsert>({
    name: 'New Plan',
    billingCycle: 'monthly',
    priceCents: 1000,
    currency: 'USD',
    isActive: true,
    limits: {},
    features: {},
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Plans</h1>
      <p className="mt-1 text-sm text-zinc-600">Create and update plans (data-driven pricing).</p>

      <div className="mt-6 grid grid-cols-1 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-semibold text-zinc-900">Create plan</div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              className="md:col-span-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="name"
            />
            <select
              className="rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
              value={form.billingCycle}
              onChange={(e) => setForm((f) => ({ ...f, billingCycle: e.target.value as any }))}
            >
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
            </select>
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              type="number"
              value={form.priceCents}
              onChange={(e) => setForm((f) => ({ ...f, priceCents: Number(e.target.value) }))}
              placeholder="priceCents"
            />
            <input
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
              placeholder="currency"
            />
            <button
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={create.isPending}
              onClick={() => create.mutate(form)}
            >
              {create.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
          {create.error ? <div className="mt-3 text-sm text-red-700">{(create.error as Error).message}</div> : null}
        </div>

        <AsyncState
          isLoading={list.isLoading}
          error={list.error}
          isEmpty={!list.isLoading && !list.error && (list.data?.plans?.length ?? 0) === 0}
          empty="No plans."
        >
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Existing</div>
            <div className="mt-3 divide-y divide-zinc-100">
              {(list.data?.plans ?? []).map((p) => (
                <div key={p.id} className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-medium text-zinc-900">
                      {p.name} <span className="text-zinc-500">({p.billingCycle})</span>
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {p.id} • {formatMoney(p.priceCents, p.currency)} • updated {new Date(p.updatedAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm disabled:opacity-60"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ planId: p.id, data: { ...p, limits: p.limits, features: p.features } })}
                      title="Re-save plan"
                    >
                      Save
                    </button>
                    <button
                      className="rounded-lg border border-zinc-200 bg-white px-3 py-1 text-sm disabled:opacity-60"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ planId: p.id, data: { ...p, isActive: !p.isActive, limits: p.limits, features: p.features } })}
                    >
                      {p.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {update.error ? <div className="mt-3 text-sm text-red-700">{(update.error as Error).message}</div> : null}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
