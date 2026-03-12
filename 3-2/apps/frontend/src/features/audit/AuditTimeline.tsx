'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { formatApiError } from '@/lib/api/errors';

type AuditEvent = {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
};

export function AuditTimeline({ projectId, issueKey }: { projectId: string; issueKey: string }) {
  const q = useQuery({
    queryKey: ['audit', projectId],
    queryFn: async () => apiFetch<{ events: AuditEvent[]; nextCursor: string | null }>(`/audit?projectId=${projectId}&limit=50`),
    retry: false,
  });

  const events = useMemo(() => {
    if (!q.data) return [] as AuditEvent[];
    return q.data.events.filter((e) => {
      const entityType = (e.entityType ?? '').toLowerCase();
      if (entityType !== 'issue') return false;
      const beforeKey = e.before?.issueKey;
      const afterKey = e.after?.issueKey;
      return beforeKey === issueKey || afterKey === issueKey;
    });
  }, [q.data, issueKey]);

  if (q.isLoading) return <div className="text-sm text-slate-600">Loading…</div>;
  if (q.isError) return <div className="text-sm text-red-700">{formatApiError(q.error)}</div>;

  if (events.length === 0) return <div className="text-sm text-slate-500">No audit events yet.</div>;

  return (
    <div className="space-y-2">
      {events.map((e, idx) => (
        <div key={idx} className="rounded border bg-slate-50 p-3">
          <div className="mb-1 text-xs text-slate-500">
            {new Date(e.createdAt).toLocaleString()} · {e.actorEmail}
          </div>
          <div className="text-sm font-medium text-slate-800">{e.action}</div>
          {(e.before || e.after) && (
            <pre className="mt-2 overflow-auto rounded bg-white p-2 text-xs text-slate-700">
              {JSON.stringify({ before: e.before, after: e.after }, null, 2)}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}
