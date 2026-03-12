'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { ReadOnlyBanner } from '@/components/state/read-only-banner';
import { useSession } from '@/lib/auth/session-context';
import {
  getOrganizationOverview,
  inviteOrganizationMember,
  listOrganizationMembers,
  updateOrganizationMember,
} from '@/services/organizations/org-members-api';

export default function Page() {
  const params = useParams<{ orgId: string }>();
  const orgId = String(params.orgId);
  const session = useSession();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState('');

  const membersQuery = useQuery({
    queryKey: ['organization-members', orgId],
    queryFn: () => listOrganizationMembers(orgId),
    enabled: session.authenticated,
  });
  const overviewQuery = useQuery({
    queryKey: ['organization-overview', orgId],
    queryFn: () => getOrganizationOverview(orgId),
    enabled: session.authenticated,
  });

  const inviteMutation = useMutation({
    mutationFn: () => inviteOrganizationMember(orgId, inviteEmail, session.csrfToken),
    onSuccess: async () => {
      setInviteEmail('');
      await queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ membershipId, payload }: { membershipId: string; payload: { orgRole?: 'org_admin' | 'org_member'; status?: 'active' | 'removed' } }) =>
      updateOrganizationMember(orgId, membershipId, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['organization-members', orgId] });
    },
  });

  if (session.loading || membersQuery.isLoading || overviewQuery.isLoading) {
    return <LoadingPageState title="Loading organization members..." message="Fetching current memberships and invite controls." />;
  }

  if (membersQuery.isError || overviewQuery.isError || !membersQuery.data || !overviewQuery.data) {
    return <ErrorPageState title="Unable to load organization members." message="The membership directory could not be retrieved." />;
  }

  const suspended = overviewQuery.data.status === 'suspended';

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Organization administration</p>
        <h2>Members and invitation flow</h2>
      </div>
      {suspended ? <ReadOnlyBanner title="Organization suspended" message="Invites and role changes are disabled until a platform admin reactivates this organization." /> : null}

      <div className="two-column-grid">
        <section className="panel stack">
          <h3>Invite member</h3>
          <label className="field">
            <span>Email</span>
            <input aria-label="Invite member email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} />
          </label>
          <div className="actions">
            <button className="button" type="button" disabled={inviteMutation.isPending || !inviteEmail.trim() || suspended} onClick={() => void inviteMutation.mutateAsync()}>
              Send invite
            </button>
          </div>
        </section>

        <section className="panel stack">
          <h3>Current members</h3>
          {membersQuery.data.map((member) => (
            <article className="card-row admin-card" key={member.membershipId}>
              <div>
                <h3>{member.displayName}</h3>
                <p>
                  {member.email} · {member.status}
                </p>
              </div>
              <div className="actions compact-actions">
                <label className="field inline-field">
                  <span className="sr-only">Role for {member.displayName}</span>
                  <select
                    aria-label={`Organization role for ${member.displayName}`}
                    value={member.orgRole}
                    disabled={suspended}
                    onChange={(event) =>
                      void updateMutation.mutateAsync({
                        membershipId: member.membershipId,
                        payload: { orgRole: event.target.value as 'org_admin' | 'org_member' },
                      })
                    }
                  >
                    <option value="org_admin">org_admin</option>
                    <option value="org_member">org_member</option>
                  </select>
                </label>
                {member.status === 'active' ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={suspended}
                    onClick={() => void updateMutation.mutateAsync({ membershipId: member.membershipId, payload: { status: 'removed' } })}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
