'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import * as React from 'react';
import { z } from 'zod';
import { AsyncState } from '../../../src/components/AsyncState';
import { apiFetch } from '../../../src/lib/api';

const filterSchema = z.object({
  actorUserId: z.string().optional(),
  organizationId: z.string().optional(),
  action: z.string().optional(),
  limit: z.number().int().min(1).max(100),
});

type Filters = z.infer<typeof filterSchema>;

type AuditLog = {
  id: string;
  actorUserId: string;
  roleContext: 'GUEST' | 'END_USER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN' | 'SYSTEM';
  organizationId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

type AuditLogsResponse = {
  auditLogs: AuditLog[];
  nextCursor: string | null;
};

function toQuery(filters: Filters, cursor: string | null) {
  const sp = new URLSearchParams();
  if (filters.actorUserId) sp.set('actorUserId', filters.actorUserId);
  if (filters.organizationId) sp.set('organizationId', filters.organizationId);
  if (filters.action) sp.set('action', filters.action);
  sp.set('limit', String(filters.limit));
  if (cursor) sp.set('cursor', cursor);
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

export default function AdminAuditPage() {
  const [draft, setDraft] = React.useState<Filters>({
    actorUserId: '',
    organizationId: '',
    action: '',
    limit: 25,
  });

  const [applied, setApplied] = React.useState<Filters>({
    actorUserId: undefined,
    organizationId: undefined,
    action: undefined,
    limit: 25,
  });

  const q = useInfiniteQuery({
    queryKey: ['admin', 'audit', applied],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => apiFetch<AuditLogsResponse>(`/admin/audit${toQuery(applied, pageParam)}`),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const rows = React.useMemo(() => q.data?.pages.flatMap((p) => p.auditLogs) ?? [], [q.data]);

  const apply = () => {
    const parsed = filterSchema.safeParse({
      actorUserId: draft.actorUserId?.trim() ? draft.actorUserId.trim() : undefined,
      organizationId: draft.organizationId?.trim() ? draft.organizationId.trim() : undefined,
      action: draft.action?.trim() ? draft.action.trim() : undefined,
      limit: draft.limit,
    });
    if (!parsed.success) {
      alert(parsed.error.message);
      return;
    }
    setApplied(parsed.data);
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-900">Audit</h1>
      <p className="mt-1 text-sm text-zinc-600">Query audit logs with filters and pagination.</p>

      <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <input
            className="md:col-span-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={draft.actorUserId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, actorUserId: e.target.value }))}
            placeholder="actorUserId"
          />
          <input
            className="md:col-span-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={draft.organizationId ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, organizationId: e.target.value }))}
            placeholder="organizationId"
          />
          <input
            className="md:col-span-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
            value={draft.action ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, action: e.target.value }))}
            placeholder="action"
          />
          <div className="md:col-span-1 flex items-center gap-2">
            <input
              className="w-24 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
              type="number"
              min={1}
              max={100}
              value={draft.limit}
              onChange={(e) => setDraft((d) => ({ ...d, limit: Number(e.target.value) }))}
              placeholder="limit"
            />
            <button
              className="flex-1 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white"
              onClick={apply}
              disabled={q.isFetching}
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <AsyncState
          isLoading={q.isLoading}
          error={q.error}
          isEmpty={!q.isLoading && !q.error && rows.length === 0}
          empty="No audit logs."
        >
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200 text-sm">
                <thead className="bg-zinc-50 text-left text-xs font-medium text-zinc-600">
                  <tr>
                    <th className="px-4 py-3">When</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Org</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Target</th>
                    <th className="px-4 py-3">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-zinc-500">{r.roleContext}</div>
                        <div className="font-mono text-xs text-zinc-800">{r.actorUserId}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-zinc-800">{r.organizationId ?? '—'}</td>
                      <td className="px-4 py-3 text-zinc-900">{r.action}</td>
                      <td className="px-4 py-3 text-xs text-zinc-700">
                        {r.targetType}
                        {r.targetId ? <div className="font-mono text-[11px] text-zinc-500">{r.targetId}</div> : null}
                      </td>
                      <td className="px-4 py-3">
                        <pre className="max-w-[480px] overflow-auto rounded-lg bg-zinc-50 p-2 text-[11px] text-zinc-700">
                          {JSON.stringify(r.payload ?? {}, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-white px-4 py-3">
              <div className="text-xs text-zinc-600">{q.isFetchingNextPage ? 'Loading…' : `${rows.length} rows`}</div>
              <button
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm disabled:opacity-60"
                disabled={!q.hasNextPage || q.isFetchingNextPage}
                onClick={() => q.fetchNextPage()}
              >
                Load more
              </button>
            </div>
          </div>
        </AsyncState>
      </div>
    </div>
  );
}
