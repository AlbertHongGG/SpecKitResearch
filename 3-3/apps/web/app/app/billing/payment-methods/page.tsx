'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { z } from 'zod';
import { AsyncState } from '../../../../src/components/AsyncState';
import { RequireOrgRole } from '../../../../src/features/auth/requireRole';
import { apiFetch } from '../../../../src/lib/api';

type PaymentMethod = {
  id: string;
  provider: string;
  isDefault: boolean;
  createdAt: string;
};

type PaymentMethodsResponse = { paymentMethods: PaymentMethod[] };

const addSchema = z.object({
  paymentMethodToken: z.string().min(1),
  setDefault: z.boolean().optional(),
});

type AddForm = z.infer<typeof addSchema>;

export default function PaymentMethodsPage() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['app', 'billing', 'paymentMethods'],
    queryFn: () => apiFetch<PaymentMethodsResponse>('/app/billing/payment-methods'),
  });

  const add = useMutation({
    mutationFn: async (input: AddForm) => {
      const parsed = addSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.message);
      return apiFetch<PaymentMethodsResponse>('/app/billing/payment-methods', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['app', 'billing', 'paymentMethods'] });
    },
  });

  const [token, setToken] = React.useState('pm_test_123');
  const [setDefault, setSetDefault] = React.useState(true);

  return (
    <RequireOrgRole role="ORG_ADMIN">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Payment methods</h1>
        <p className="mt-1 text-sm text-zinc-600">Org Admin only (token/reference only).</p>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm font-semibold text-zinc-900">Add payment method</div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <input
                className="col-span-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="paymentMethodToken"
              />
              <button
                className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                disabled={add.isPending}
                onClick={() => add.mutate({ paymentMethodToken: token, setDefault })}
              >
                {add.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={setDefault} onChange={(e) => setSetDefault(e.target.checked)} />
              Set as default
            </label>
            {add.error ? <div className="mt-3 text-sm text-red-700">{(add.error as Error).message}</div> : null}
          </div>

          <AsyncState
            isLoading={list.isLoading}
            error={list.error}
            isEmpty={!list.isLoading && !list.error && (list.data?.paymentMethods?.length ?? 0) === 0}
            empty="No payment methods yet."
          >
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-zinc-900">Saved</div>
              <div className="mt-3 divide-y divide-zinc-100">
                {(list.data?.paymentMethods ?? []).map((pm) => (
                  <div key={pm.id} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-zinc-900">{pm.provider}</div>
                      <div className="mt-1 text-xs text-zinc-500">{pm.id}</div>
                    </div>
                    <div className="text-xs text-zinc-600">
                      {pm.isDefault ? (
                        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                          default
                        </span>
                      ) : (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AsyncState>
        </div>
      </div>
    </RequireOrgRole>
  );
}
