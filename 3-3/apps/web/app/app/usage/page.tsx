'use client';

import { useQuery } from '@tanstack/react-query';
import * as React from 'react';
import { AsyncState } from '../../../src/components/AsyncState';
import { apiFetch } from '../../../src/lib/api';

type UsageMeter = {
  code: 'API_CALLS' | 'STORAGE_BYTES' | 'USER_COUNT' | 'PROJECT_COUNT';
  name: string;
  unit: string;
  value: number;
  limit: number | null;
  policy: 'block' | 'throttle' | 'overage';
  status: 'ok' | 'nearLimit' | 'overLimit';
  resetAt: string;
};

type UsageResponse = {
  meters: UsageMeter[];
};

function statusBadge(status: UsageMeter['status']) {
  const cls =
    status === 'ok'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'nearLimit'
        ? 'bg-amber-50 text-amber-900 border-amber-200'
        : 'bg-red-50 text-red-800 border-red-200';
  return <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

export default function UsagePage() {
  const q = useQuery({
    queryKey: ['app', 'usage'],
    queryFn: () => apiFetch<UsageResponse>('/app/usage'),
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Usage</h1>
      <p className="mt-1 text-sm text-zinc-600">Current billing-period usage meters and policies.</p>

      <div className="mt-6">
        <AsyncState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={!q.isLoading && !q.error && (q.data?.meters?.length ?? 0) === 0}
          empty="No meters returned."
        >
          <div className="grid grid-cols-1 gap-4">
            {(q.data?.meters ?? []).map((m) => (
              <div key={m.code} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-zinc-900">{m.name}</div>
                    <div className="mt-1 text-xs text-zinc-500">{m.code}</div>
                  </div>
                  {statusBadge(m.status)}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-6 text-sm">
                  <div>
                    <div className="text-xs text-zinc-500">Value</div>
                    <div className="font-medium text-zinc-900">
                      {m.value} {m.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Limit</div>
                    <div className="font-medium text-zinc-900">{m.limit ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Policy</div>
                    <div className="font-medium text-zinc-900">{m.policy}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500">Reset</div>
                    <div className="font-medium text-zinc-900">{new Date(m.resetAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
