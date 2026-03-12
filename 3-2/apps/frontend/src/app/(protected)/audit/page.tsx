'use client';

import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { formatApiError } from '@/lib/api/errors';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { useSession } from '@/features/auth/useSession';
import { sanitizeText } from '@/lib/security/sanitize';

type OrgSummary = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

type AuditEvent = {
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
  createdAt: string;
};

type AuditResponse = {
  events: AuditEvent[];
  nextCursor: string | null;
};

type Scope = 'org' | 'project' | 'platform';

export default function AuditPage() {
  const session = useSession();
  const isPlatformAdmin = session.data?.user?.platformRole === 'platform_admin';

  const [scope, setScope] = useState<Scope>(isPlatformAdmin ? 'platform' : 'org');
  const [projectId, setProjectId] = useState('');

  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => apiFetch<{ organizations: OrgSummary[] }>(`/orgs`),
    retry: false,
  });

  const orgs = orgsQ.data?.organizations ?? [];
  const [orgId, setOrgId] = useState<string>('');

  useEffect(() => {
    if (!orgId && orgs.length > 0) {
      setOrgId(orgs[0]!.id);
    }
  }, [orgId, orgs]);

  const queryString = useMemo(() => {
    if (scope === 'platform') return '';
    if (scope === 'org') return orgId ? `orgId=${encodeURIComponent(orgId)}` : '';
    if (scope === 'project') return projectId.trim() ? `projectId=${encodeURIComponent(projectId.trim())}` : '';
    return '';
  }, [scope, orgId, projectId]);

  const auditQ = useInfiniteQuery({
    queryKey: ['audit', scope, queryString],
    queryFn: async ({ pageParam }) => {
      const cursorPart = pageParam ? `&cursor=${encodeURIComponent(String(pageParam))}` : '';
      const qs = queryString ? `?${queryString}&limit=50${cursorPart}` : `?limit=50${cursorPart}`;
      return await apiFetch<AuditResponse>(`/audit${qs}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    retry: false,
    enabled:
      scope === 'platform'
        ? isPlatformAdmin
        : scope === 'org'
          ? !!orgId
          : scope === 'project'
            ? !!projectId.trim()
            : false,
  });

  const events = useMemo(() => {
    const pages = auditQ.data?.pages ?? [];
    return pages.flatMap((p) => p.events);
  }, [auditQ.data]);

  if (orgsQ.isLoading) return <LoadingState />;
  if (orgsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(orgsQ.error)} />;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Audit</h1>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Scope</div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
          {isPlatformAdmin ? (
            <label className="flex items-center gap-2">
              <input type="radio" name="scope" checked={scope === 'platform'} onChange={() => setScope('platform')} />
              platform
            </label>
          ) : null}
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={scope === 'org'} onChange={() => setScope('org')} />
            org
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="scope" checked={scope === 'project'} onChange={() => setScope('project')} />
            project
          </label>
        </div>

        {scope === 'org' ? (
          <div className="mt-3">
            <div className="text-sm font-medium">Organization</div>
            <select className="mt-1 rounded border p-2 text-sm" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Select…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} ({o.status})
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {scope === 'project' ? (
          <div className="mt-3">
            <div className="text-sm font-medium">Project ID</div>
            <input
              className="mt-1 w-full rounded border p-2 text-sm"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Paste projectId…"
            />
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        {auditQ.isLoading ? <LoadingState /> : null}
        {auditQ.isError ? <ErrorState title="載入失敗" message={formatApiError(auditQ.error)} /> : null}
      </div>

      {auditQ.isSuccess && events.length === 0 ? (
        <div className="mt-4 text-sm text-slate-600">No audit events.</div>
      ) : null}

      <div className="mt-4 space-y-2">
        {events.map((e, idx) => (
          <div key={idx} className="rounded border bg-slate-50 p-3">
            <div className="mb-1 text-xs text-slate-500">
              {new Date(e.createdAt).toLocaleString()} · {e.actorEmail}
            </div>
            <div className="text-sm font-medium text-slate-800">
              {sanitizeText(e.action)} · {sanitizeText(e.entityType)} · {sanitizeText(e.entityId)}
            </div>
            {(e.before || e.after) && (
              <pre className="mt-2 overflow-auto rounded bg-white p-2 text-xs text-slate-700">
                {JSON.stringify({ before: e.before, after: e.after }, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>

      {auditQ.hasNextPage ? (
        <button
          type="button"
          className="mt-4 rounded border px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
          disabled={auditQ.isFetchingNextPage}
          onClick={() => auditQ.fetchNextPage()}
        >
          {auditQ.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </main>
  );
}
