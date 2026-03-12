'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { ErrorState, LoadingState, EmptyState } from '@/components/PageStates';
import { ReadOnlyBanner, readOnlyReasonFromOrgStatus } from '@/components/ReadOnlyBanner';
import { sanitizeText } from '@/lib/security/sanitize';

type OrgSummary = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

type Project = {
  id: string;
  key: string;
  name: string;
  type: 'scrum' | 'kanban';
  status: 'active' | 'archived';
};

export default function OrgProjectsPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const qc = useQueryClient();

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'scrum' | 'kanban'>('scrum');

  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => apiFetch<{ organizations: OrgSummary[] }>('/orgs'),
    retry: false,
  });

  const q = useQuery({
    queryKey: ['org-projects', orgId],
    queryFn: async () => {
      return await apiFetch<{ projects: Project[] }>(`/orgs/${encodeURIComponent(orgId)}/projects`);
    },
    retry: false,
  });

  const orgMeta = useMemo(() => {
    const orgs = orgsQ.data?.organizations ?? [];
    return orgs.find((o) => o.id === orgId) ?? null;
  }, [orgsQ.data, orgId]);

  const readOnlyReason = readOnlyReasonFromOrgStatus(orgMeta?.status);

  const createM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({
        method: 'POST',
        body: JSON.stringify({ key, name, type }),
      });
      return await apiFetch<{ projectId: string }>(`/orgs/${encodeURIComponent(orgId)}/projects`, init);
    },
    onSuccess: async () => {
      setKey('');
      setName('');
      setType('scrum');
      await qc.invalidateQueries({ queryKey: ['org-projects', orgId] });
    },
  });

  if (orgsQ.isLoading || q.isLoading) return <LoadingState />;
  if (orgsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(orgsQ.error)} />;
  if (q.isError) return <ErrorState title="載入失敗" message={formatApiError(q.error)} />;

  if (!q.data) return <ErrorState title="載入失敗" message="No data" />;

  const projects = q.data.projects;
  const canCreate = orgMeta?.roleInOrg === 'org_admin' && !readOnlyReason;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Projects</h1>
          <div className="text-sm text-slate-600">Org ID: {orgId}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/members`}>
            Members
          </a>
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/invites`}>
            Invites
          </a>
        </div>
      </div>

      <div className="mt-4">
        <ReadOnlyBanner reason={readOnlyReason} />
      </div>

      {orgMeta?.roleInOrg === 'org_admin' ? (
        <div className="mt-4 rounded border p-4">
          <div className="font-medium">Create project</div>
          <div className="mt-2 grid gap-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border p-2"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="Key (e.g. PROJ)"
                disabled={!!readOnlyReason || createM.isPending}
              />
              <select
                className="rounded border p-2"
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                disabled={!!readOnlyReason || createM.isPending}
              >
                <option value="scrum">scrum</option>
                <option value="kanban">kanban</option>
              </select>
            </div>
            <input
              className="rounded border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Project name"
              disabled={!!readOnlyReason || createM.isPending}
            />
            <button
              type="button"
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
              disabled={!canCreate || createM.isPending || !key.trim() || !name.trim()}
              onClick={() => createM.mutate()}
            >
              Create
            </button>
            {createM.isError ? <div className="text-sm text-red-700">{formatApiError(createM.error)}</div> : null}
          </div>
        </div>
      ) : null}

      {!projects.length ? (
        <EmptyState
          title="尚無專案"
          description={orgMeta?.roleInOrg === 'org_admin' ? '你可以先建立一個專案。' : '請請 Org Admin 建立專案。'}
        />
      ) : null}

      <ul className="mt-4 space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">
                  {sanitizeText(p.key)}: {sanitizeText(p.name)}
                </div>
                <div className="text-sm text-slate-600">
                  {p.type} / {p.status}
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <a className="text-blue-700 underline" href={`/projects/${p.id}/board`}>
                  Board
                </a>
                <a className="text-blue-700 underline" href={`/projects/${p.id}/settings`}>
                  Settings
                </a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
