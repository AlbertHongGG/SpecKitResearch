'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { apiFetch } from '../../lib/api';

export function SimulatePaymentButtons(props: { orgId: string; invoiceId: string }) {
  const qc = useQueryClient();

  const simulate = useMutation({
    mutationFn: async (result: 'success' | 'fail') => {
      await apiFetch<void>(`/app/billing/invoices/${props.invoiceId}/simulate-payment`, {
        method: 'POST',
        orgId: props.orgId,
        body: JSON.stringify({ result }),
      });
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['app', 'invoices', props.orgId] }),
        qc.invalidateQueries({ queryKey: ['app', 'subscription', props.orgId] }),
        qc.invalidateQueries({ queryKey: ['app', 'dashboard', props.orgId] }),
      ]);
    },
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        disabled={simulate.isPending}
        onClick={() => simulate.mutate('success')}
      >
        Simulate success
      </button>
      <button
        type="button"
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        disabled={simulate.isPending}
        onClick={() => simulate.mutate('fail')}
      >
        Simulate fail
      </button>
      {simulate.error ? (
        <span className="text-xs text-red-700">{(simulate.error as Error).message}</span>
      ) : null}
      {simulate.isSuccess ? <span className="text-xs text-zinc-500">Queued</span> : null}
    </div>
  );
}
