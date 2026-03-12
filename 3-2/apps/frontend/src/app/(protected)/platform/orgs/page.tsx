'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';

type Org = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
};

export default function PlatformOrgsAdminPage() {
  const qc = useQueryClient();

  const [createName, setCreateName] = useState('');
  const [createPlan, setCreatePlan] = useState<'free' | 'paid'>('free');

  const q = useQuery({
    queryKey: ['platform-orgs'],
    queryFn: async () => {
      return await apiFetch<{ organizations: Org[]; nextCursor: string | null }>(`/platform/orgs?limit=50`);
    },
    retry: false,
  });

  const orgs = q.data?.organizations ?? [];

  const createM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ name: createName, plan: createPlan }),
      });
      return await apiFetch<{ orgId: string }>(`/platform/orgs`, init);
    },
    onSuccess: async () => {
      setCreateName('');
      setCreatePlan('free');
      await qc.invalidateQueries({ queryKey: ['platform-orgs'] });
    },
  });

  const patchM = useMutation({
    mutationFn: async (params: { orgId: string; patch: Partial<Pick<Org, 'name' | 'plan' | 'status'>> }) => {
      const init = await withCsrf({
        method: 'PATCH',
        body: JSON.stringify(params.patch),
      });
      return await apiFetch<{ ok: true }>(`/platform/orgs/${encodeURIComponent(params.orgId)}`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['platform-orgs'] });
    },
  });

  const items = useMemo(() => {
    return orgs.map((o) => ({ ...o }));
  }, [orgs]);

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState title="載入失敗" message={formatApiError(q.error)} />;

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-xl font-semibold">Platform · Organizations</h1>
        <div className="mt-4 rounded border p-4">
          <div className="font-medium">Create Organization</div>
          <div className="mt-2 grid gap-2">
            <input
              className="rounded border p-2"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Org name"
            />
            <select className="rounded border p-2" value={createPlan} onChange={(e) => setCreatePlan(e.target.value as any)}>
              <option value="free">free</option>
              <option value="paid">paid</option>
            </select>
            <button
              type="button"
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!createName.trim() || createM.isPending}
              onClick={() => createM.mutate()}
            >
              Create
            </button>
            {createM.isError ? <div className="text-sm text-red-700">{formatApiError(createM.error)}</div> : null}
          </div>
        </div>
        <EmptyState title="尚無 Organizations" description="你可以先建立一個 Organization。" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Platform · Organizations</h1>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Create Organization</div>
        <div className="mt-2 grid gap-2">
          <input
            className="rounded border p-2"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder="Org name"
          />
          <select className="rounded border p-2" value={createPlan} onChange={(e) => setCreatePlan(e.target.value as any)}>
            <option value="free">free</option>
            <option value="paid">paid</option>
          </select>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!createName.trim() || createM.isPending}
            onClick={() => createM.mutate()}
          >
            Create
          </button>
          {createM.isError ? <div className="text-sm text-red-700">{formatApiError(createM.error)}</div> : null}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((o) => (
          <li key={o.id} className="rounded border p-4">
            <div className="grid gap-2">
              <div className="text-sm text-slate-600">Org ID: {o.id}</div>
              <label className="grid gap-1">
                <div className="text-sm font-medium">Name</div>
                <input
                  className="rounded border p-2"
                  defaultValue={o.name}
                  onBlur={(e) => {
                    const next = e.target.value;
                    if (next !== o.name) {
                      patchM.mutate({ orgId: o.id, patch: { name: next } });
                    }
                  }}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1">
                  <div className="text-sm font-medium">Plan</div>
                  <select
                    className="rounded border p-2"
                    defaultValue={o.plan}
                    onChange={(e) => patchM.mutate({ orgId: o.id, patch: { plan: e.target.value as any } })}
                  >
                    <option value="free">free</option>
                    <option value="paid">paid</option>
                  </select>
                </label>
                <label className="grid gap-1">
                  <div className="text-sm font-medium">Status</div>
                  <select
                    className="rounded border p-2"
                    defaultValue={o.status}
                    onChange={(e) => patchM.mutate({ orgId: o.id, patch: { status: e.target.value as any } })}
                  >
                    <option value="active">active</option>
                    <option value="suspended">suspended</option>
                  </select>
                </label>
              </div>
              {patchM.isError ? <div className="text-sm text-red-700">{formatApiError(patchM.error)}</div> : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
