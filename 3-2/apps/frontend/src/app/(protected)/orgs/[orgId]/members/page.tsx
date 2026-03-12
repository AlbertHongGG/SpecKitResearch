'use client';

import { useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { EmptyState, ErrorState, LoadingState } from '@/components/PageStates';
import { ReadOnlyBanner, readOnlyReasonFromOrgStatus } from '@/components/ReadOnlyBanner';

type OrgSummary = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

type Member = {
  userId: string;
  email: string;
  displayName: string;
  orgRole: 'org_admin' | 'org_member';
};

export default function OrgMembersAdminPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;
  const qc = useQueryClient();

  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => apiFetch<{ organizations: OrgSummary[] }>(`/orgs`),
    retry: false,
  });

  const membersQ = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => apiFetch<{ members: Member[] }>(`/orgs/${encodeURIComponent(orgId)}/members`),
    retry: false,
  });

  const orgMeta = useMemo(() => {
    const orgs = orgsQ.data?.organizations ?? [];
    return orgs.find((o) => o.id === orgId) ?? null;
  }, [orgsQ.data, orgId]);

  const readOnlyReason = readOnlyReasonFromOrgStatus(orgMeta?.status);
  const disableMutations = !!readOnlyReason;

  const updateRoleM = useMutation({
    mutationFn: async (params: { userId: string; orgRole: 'org_admin' | 'org_member' }) => {
      const init = await withCsrf({ method: 'PATCH', body: JSON.stringify({ orgRole: params.orgRole }) });
      return await apiFetch<{ ok: true }>(`/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(params.userId)}`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['org-members', orgId] });
    },
  });

  const removeM = useMutation({
    mutationFn: async (params: { userId: string }) => {
      const init = await withCsrf({ method: 'DELETE' });
      return await apiFetch<{ ok: true }>(`/orgs/${encodeURIComponent(orgId)}/members/${encodeURIComponent(params.userId)}`, init);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['org-members', orgId] });
    },
  });

  if (orgsQ.isLoading || membersQ.isLoading) return <LoadingState />;
  if (orgsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(orgsQ.error)} />;
  if (membersQ.isError) return <ErrorState title="載入失敗" message={formatApiError(membersQ.error)} />;

  const members = membersQ.data?.members ?? [];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Org Members</h1>
          <div className="text-sm text-slate-600">Org ID: {orgId}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/projects`}>
            Projects
          </a>
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/invites`}>
            Invites
          </a>
        </div>
      </div>

      <div className="mt-4">
        <ReadOnlyBanner reason={readOnlyReason} />
      </div>

      {members.length === 0 ? <EmptyState title="尚無成員" description="目前沒有可管理的成員。" /> : null}

      <ul className="mt-4 space-y-2">
        {members.map((m) => (
          <li key={m.userId} className="rounded border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">{m.displayName}</div>
                <div className="text-sm text-slate-600">{m.email}</div>
                <div className="mt-1 text-xs text-slate-500">User ID: {m.userId}</div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  className="rounded border p-2 text-sm"
                  defaultValue={m.orgRole}
                  disabled={disableMutations || updateRoleM.isPending}
                  onChange={(e) => updateRoleM.mutate({ userId: m.userId, orgRole: e.target.value as any })}
                >
                  <option value="org_admin">org_admin</option>
                  <option value="org_member">org_member</option>
                </select>

                <button
                  type="button"
                  className="rounded border px-3 py-2 text-sm text-slate-900 disabled:opacity-50"
                  disabled={disableMutations || removeM.isPending}
                  onClick={() => {
                    if (!confirm('Remove this member from org?')) return;
                    removeM.mutate({ userId: m.userId });
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {updateRoleM.isError ? <div className="mt-3 text-sm text-red-700">{formatApiError(updateRoleM.error)}</div> : null}
      {removeM.isError ? <div className="mt-3 text-sm text-red-700">{formatApiError(removeM.error)}</div> : null}
    </main>
  );
}
