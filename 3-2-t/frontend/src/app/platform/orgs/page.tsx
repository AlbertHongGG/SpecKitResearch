'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { useSession } from '@/lib/auth/session-context';
import {
  createPlatformOrganization,
  listPlatformOrganizations,
  updatePlatformOrganization,
  type PlatformOrganizationSummary,
} from '@/services/platform/platform-api';

export default function Page() {
  const session = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ name: '', plan: 'free' as PlatformOrganizationSummary['plan'] });

  const organizationsQuery = useQuery({
    queryKey: ['platform-organizations'],
    queryFn: listPlatformOrganizations,
    enabled: session.authenticated,
  });

  const createMutation = useMutation({
    mutationFn: () => createPlatformOrganization(form, session.csrfToken),
    onSuccess: async () => {
      setForm({ name: '', plan: 'free' });
      await queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ organizationId, payload }: { organizationId: string; payload: Partial<PlatformOrganizationSummary> }) =>
      updatePlatformOrganization(organizationId, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platform-organizations'] });
    },
  });

  if (session.loading || organizationsQuery.isLoading) {
    return <LoadingPageState title="Loading platform organizations..." message="Fetching platform governance data." />;
  }

  if (organizationsQuery.isError || !organizationsQuery.data) {
    return <ErrorPageState title="Unable to load platform administration." message="Check the backend session and platform permissions." />;
  }

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Platform governance</p>
        <h2>Manage organization lifecycle</h2>
      </div>

      <div className="two-column-grid">
        <section className="panel stack">
          <h3>Create organization</h3>
          <label className="field">
            <span>Organization name</span>
            <input aria-label="Organization name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Plan</span>
            <select aria-label="Organization plan" value={form.plan} onChange={(event) => setForm((current) => ({ ...current, plan: event.target.value as PlatformOrganizationSummary['plan'] }))}>
              <option value="free">free</option>
              <option value="paid">paid</option>
            </select>
          </label>
          <div className="actions">
            <button className="button" type="button" disabled={createMutation.isPending} onClick={() => void createMutation.mutateAsync()}>
              Create organization
            </button>
          </div>
        </section>

        <section className="panel stack">
          <h3>Organizations</h3>
          {organizationsQuery.data.map((organization) => (
            <article key={organization.organizationId} className="card-row admin-card">
              <div>
                <h3>{organization.name}</h3>
                <p>
                  {organization.plan} plan · {organization.memberCount} members · {organization.projectCount} projects
                </p>
              </div>
              <div className="actions compact-actions">
                <span className="pill">{organization.status}</span>
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() =>
                    void updateMutation.mutateAsync({
                      organizationId: organization.organizationId,
                      payload: { status: organization.status === 'active' ? 'suspended' : 'active' },
                    })
                  }
                >
                  {organization.status === 'active' ? 'Suspend' : 'Reactivate'}
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
