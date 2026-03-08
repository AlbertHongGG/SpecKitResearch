'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch } from '../../lib/api';

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
  pendingChange?: { pendingPlanId: string; effectiveAt: string };
  entitlements: { features: Record<string, boolean>; limits: Record<string, unknown>; statusReason?: string };
};

type Invoice = {
  id: string;
  status: 'Draft' | 'Open' | 'Paid' | 'Failed' | 'Voided';
  billingPeriod: { start: string; end: string };
  totalCents: number;
  currency: string;
  createdAt: string;
  dueAt?: string | null;
  paidAt?: string | null;
  failedAt?: string | null;
};

const formSchema = z.object({
  targetBillingCycle: z.enum(['monthly', 'yearly']),
  targetPlanId: z.string().min(1, 'Please select a plan'),
  confirm: z.boolean().refine((v) => v, 'Confirmation is required'),
});

type FormValues = z.infer<typeof formSchema>;

export function UpgradeDowngradeModal(props: {
  open: boolean;
  mode: 'upgrade' | 'downgrade';
  orgId: string;
  subscription: SubscriptionSummaryResponse;
  plans: PlanPublic[];
  onClose: () => void;
  onDone: () => Promise<void> | void;
}) {
  const { open, mode, orgId, subscription, plans } = props;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      targetBillingCycle: subscription.billingCycle,
      targetPlanId: '',
      confirm: false,
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({
      targetBillingCycle: subscription.billingCycle,
      targetPlanId: '',
      confirm: false,
    });
  }, [open, subscription.billingCycle, form]);

  const billingCycle = form.watch('targetBillingCycle');
  const candidatePlans = plans
    .filter((p) => p.isActive)
    .filter((p) => p.billingCycle === billingCycle)
    .filter((p) => p.id !== subscription.plan.id);

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const path = mode === 'upgrade' ? '/app/subscription/upgrade' : '/app/subscription/downgrade';
      return apiFetch<
        | { subscription: SubscriptionSummaryResponse; prorationInvoice: Invoice }
        | { subscription: SubscriptionSummaryResponse }
      >(path, {
        method: 'POST',
        orgId,
        body: JSON.stringify(values),
      });
    },
    onSuccess: async () => {
      await props.onDone();
    },
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b border-zinc-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-900">{mode === 'upgrade' ? 'Upgrade' : 'Downgrade'}</div>
              <div className="mt-1 text-sm text-zinc-600">
                Current plan: <span className="font-medium text-zinc-900">{subscription.plan.name}</span>
              </div>
            </div>
            <button className="rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100" onClick={props.onClose}>
              Close
            </button>
          </div>
        </div>

        <form
          className="p-5"
          onSubmit={form.handleSubmit((values) => {
            mutation.mutate(values);
          })}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-800">Billing cycle</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                {...form.register('targetBillingCycle')}
              >
                <option value="monthly">monthly</option>
                <option value="yearly">yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-800">Target plan</label>
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                {...form.register('targetPlanId')}
              >
                <option value="">Select…</option>
                {candidatePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.targetPlanId ? (
                <div className="mt-1 text-xs text-red-700">{form.formState.errors.targetPlanId.message}</div>
              ) : null}
              {candidatePlans.length === 0 ? (
                <div className="mt-1 text-xs text-zinc-500">No other active plans for this billing cycle.</div>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
              <label className="flex items-start gap-2 text-sm text-zinc-800">
                <input type="checkbox" className="mt-1" {...form.register('confirm')} />
                <span>
                  I understand this will {mode === 'upgrade' ? 'apply immediately and may create a proration invoice' : 'schedule a change for the next period'}.
                </span>
              </label>
              {form.formState.errors.confirm ? (
                <div className="mt-1 text-xs text-red-700">{form.formState.errors.confirm.message}</div>
              ) : null}
            </div>

            {mutation.error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {(mutation.error as Error).message}
              </div>
            ) : null}

            {mutation.data && 'prorationInvoice' in mutation.data ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                Upgrade accepted. Proration invoice created: <span className="font-mono">{mutation.data.prorationInvoice.id}</span>
              </div>
            ) : null}

            {mutation.data && !('prorationInvoice' in mutation.data) ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">Change accepted.</div>
            ) : null}
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
              onClick={props.onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Submitting…' : 'Confirm'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
