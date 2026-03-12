'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { withCsrf } from '@/lib/api/csrf';
import { formatApiError } from '@/lib/api/errors';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { ReadOnlyBanner, readOnlyReasonFromOrgStatus } from '@/components/ReadOnlyBanner';

type OrgSummary = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

export default function OrgInvitesAdminPage() {
  const params = useParams<{ orgId: string }>();
  const orgId = params.orgId;

  const [email, setEmail] = useState('');
  const [lastInvite, setLastInvite] = useState<{ token: string; expiresAt: string; email: string } | null>(null);

  const orgsQ = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => apiFetch<{ organizations: OrgSummary[] }>(`/orgs`),
    retry: false,
  });

  const orgMeta = useMemo(() => {
    const orgs = orgsQ.data?.organizations ?? [];
    return orgs.find((o) => o.id === orgId) ?? null;
  }, [orgsQ.data, orgId]);

  const readOnlyReason = readOnlyReasonFromOrgStatus(orgMeta?.status);

  const createM = useMutation({
    mutationFn: async () => {
      const init = await withCsrf({ method: 'POST', body: JSON.stringify({ email }) });
      return await apiFetch<{ invite: { token: string; expiresAt: string; email: string } }>(
        `/orgs/${encodeURIComponent(orgId)}/invites`,
        init,
      );
    },
    onSuccess: async (data) => {
      setLastInvite(data.invite);
      setEmail('');
    },
  });

  if (orgsQ.isLoading) return <LoadingState />;
  if (orgsQ.isError) return <ErrorState title="載入失敗" message={formatApiError(orgsQ.error)} />;

  const inviteUrl = lastInvite ? `${window.location.origin}/invite/${lastInvite.token}` : null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Org Invites</h1>
          <div className="text-sm text-slate-600">Org ID: {orgId}</div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/projects`}>
            Projects
          </a>
          <a className="text-blue-700 underline" href={`/orgs/${orgId}/members`}>
            Members
          </a>
        </div>
      </div>

      <div className="mt-4">
        <ReadOnlyBanner reason={readOnlyReason} />
      </div>

      <div className="mt-4 rounded border p-4">
        <div className="font-medium">Create invite</div>
        <div className="mt-2 grid gap-2">
          <input
            className="rounded border p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            disabled={!!readOnlyReason || createM.isPending}
          />
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!email.trim() || !!readOnlyReason || createM.isPending}
            onClick={() => createM.mutate()}
          >
            Send invite
          </button>
          {createM.isError ? <div className="text-sm text-red-700">{formatApiError(createM.error)}</div> : null}
        </div>
      </div>

      {lastInvite ? (
        <div className="mt-4 rounded border bg-slate-50 p-4">
          <div className="font-medium">Invite created</div>
          <div className="mt-1 text-sm text-slate-700">Email: {lastInvite.email}</div>
          <div className="mt-1 text-sm text-slate-700">Expires: {new Date(lastInvite.expiresAt).toLocaleString()}</div>
          <div className="mt-2 text-sm">
            <div className="text-slate-700">Link:</div>
            <a className="break-all text-blue-700 underline" href={inviteUrl ?? '#'}>
              {inviteUrl}
            </a>
          </div>
        </div>
      ) : null}
    </main>
  );
}
