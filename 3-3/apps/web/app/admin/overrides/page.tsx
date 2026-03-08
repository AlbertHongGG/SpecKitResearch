'use client';

import { useMutation } from '@tanstack/react-query';
import * as React from 'react';
import { z } from 'zod';
import { apiFetch } from '../../../src/lib/api';

const forceSchema = z.object({
  organizationId: z.string().min(1),
  forcedStatus: z.enum(['NONE', 'Suspended', 'Expired']),
  reason: z.string().min(1),
});

type ForceForm = z.infer<typeof forceSchema>;

type ForceResponse = {
  forcedStatus: 'NONE' | 'Suspended' | 'Expired';
  createdAt: string;
  revokedAt: string | null;
};

export default function AdminOverridesPage() {
  const [form, setForm] = React.useState<ForceForm>({
    organizationId: '',
    forcedStatus: 'Suspended',
    reason: 'policy',
  });

  const m = useMutation({
    mutationFn: async (input: ForceForm) => {
      const parsed = forceSchema.safeParse(input);
      if (!parsed.success) throw new Error(parsed.error.message);
      return apiFetch<ForceResponse>('/admin/overrides', { method: 'POST', body: JSON.stringify(parsed.data) });
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Overrides</h1>
      <p className="mt-1 text-sm text-zinc-600">Force org status (Suspended / Expired) with audit trail.</p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            className="md:col-span-3 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={form.organizationId}
            onChange={(e) => setForm((f) => ({ ...f, organizationId: e.target.value }))}
            placeholder="organizationId"
          />
          <select
            className="md:col-span-1 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-sm"
            value={form.forcedStatus}
            onChange={(e) => setForm((f) => ({ ...f, forcedStatus: e.target.value as any }))}
          >
            <option value="NONE">NONE</option>
            <option value="Suspended">Suspended</option>
            <option value="Expired">Expired</option>
          </select>
          <input
            className="md:col-span-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={form.reason}
            onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="reason"
          />
          <button
            className="md:col-span-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={m.isPending}
            onClick={() => m.mutate(form)}
          >
            {m.isPending ? 'Submitting…' : 'Submit'}
          </button>
        </div>

        {m.error ? <div className="mt-3 text-sm text-red-700">{(m.error as Error).message}</div> : null}
        {m.data ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
            <div>
              <span className="font-medium text-zinc-900">Result:</span> {m.data.forcedStatus}
            </div>
            <div className="mt-1 text-xs text-zinc-600">createdAt: {new Date(m.data.createdAt).toLocaleString()}</div>
            <div className="mt-1 text-xs text-zinc-600">
              revokedAt: {m.data.revokedAt ? new Date(m.data.revokedAt).toLocaleString() : '—'}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
