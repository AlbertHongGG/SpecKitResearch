'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { ReadOnlyBanner, readOnlyReasonFromOrgStatus, readOnlyReasonFromProjectStatus } from '@/components/ReadOnlyBanner';

type ProjectSettings = {
  project: {
    id: string;
    organizationId: string;
    status: 'active' | 'archived';
  };
};

type OrgSummary = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

export default function ProjectSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ['project-settings', projectId],
    queryFn: async () => apiFetch<ProjectSettings>(`/projects/${encodeURIComponent(projectId)}/settings`),
    retry: false,
  });

  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => apiFetch<{ organizations: OrgSummary[] }>(`/orgs`),
    retry: false,
  });

  const orgMeta = useMemo(() => {
    const orgId = settingsQ.data?.project.organizationId;
    if (!orgId) return null;
    const orgs = orgsQ.data?.organizations ?? [];
    return orgs.find((o) => o.id === orgId) ?? null;
  }, [orgsQ.data, settingsQ.data]);

  const projectStatus = settingsQ.data?.project.status;
  const orgStatus = orgMeta?.status;

  const readOnlyReason = readOnlyReasonFromProjectStatus(projectStatus) ?? readOnlyReasonFromOrgStatus(orgStatus);

  const canArchive = orgMeta?.roleInOrg === 'org_admin' && projectStatus === 'active' && !readOnlyReason;

  const archiveM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST' });
      return await apiFetch<{ ok: true }>(`/projects/${encodeURIComponent(projectId)}/settings/archive`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-settings', projectId] });
    },
  });

  if (settingsQ.isLoading || orgsQ.isLoading) return <LoadingState />;
  if (settingsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(settingsQ.error)} />;
  if (orgsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(orgsQ.error)} />;

  const orgId = settingsQ.data?.project.organizationId;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">Project Settings</h1>
      <div className="mt-1 text-sm text-slate-600">Project ID: {projectId}</div>

      <div className="mt-4">
        <ReadOnlyBanner reason={readOnlyReason} />
      </div>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Status</div>
        <div className="mt-1 text-sm text-slate-700">project.status = {projectStatus}</div>
        {orgMeta ? <div className="mt-1 text-sm text-slate-700">org.status = {orgMeta.status}</div> : null}
      </div>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Role management</div>
        <div className="mt-1 text-sm text-slate-700">
          Project role assignment is managed at the organization scope.
        </div>
        {orgId ? (
          <div className="mt-2 flex items-center gap-3 text-sm">
            <a className="text-blue-700 underline" href={`/orgs/${orgId}/members`}>
              Go to org members
            </a>
            <a className="text-blue-700 underline" href={`/orgs/${orgId}/projects`}>
              Go to org projects
            </a>
          </div>
        ) : null}
      </div>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Archive (irreversible)</div>
        <div className="mt-1 text-sm text-slate-700">
          Archiving makes the project read-only permanently.
        </div>

        {orgMeta?.roleInOrg !== 'org_admin' ? (
          <div className="mt-2 text-sm text-slate-600">Only org_admin can archive this project.</div>
        ) : null}

        <button
          type="button"
          className="mt-3 rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          disabled={!canArchive || archiveM.isPending}
          onClick={() => {
            if (!confirm('Archive this project? This cannot be undone.')) return;
            archiveM.mutate();
          }}
        >
          Archive project
        </button>

        {archiveM.isError ? <div className="mt-2 text-sm text-red-700">{formatApiError(archiveM.error)}</div> : null}
        {archiveM.isSuccess ? <div className="mt-2 text-sm text-slate-700">Archived.</div> : null}
      </div>
    </main>
  );
}
