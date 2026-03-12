'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { ReadOnlyBanner } from '@/components/state/read-only-banner';
import { ArchiveProjectSettings } from '@/features/projects/components/archive-project-settings';
import { ProjectMembersSettings } from '@/features/projects/components/project-members-settings';
import { useSession } from '@/lib/auth/session-context';
import { getOrganizationOverview, listOrganizationMembers } from '@/services/organizations/org-members-api';
import {
  createOrganizationProject,
  listOrganizationProjects,
  type OrganizationProjectSummary,
} from '@/services/projects/project-admin-api';

export default function Page() {
  const params = useParams<{ orgId: string }>();
  const orgId = String(params.orgId);
  const session = useSession();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ key: '', name: '', type: 'scrum' as OrganizationProjectSummary['type'] });

  const projectsQuery = useQuery({
    queryKey: ['organization-projects', orgId],
    queryFn: () => listOrganizationProjects(orgId),
    enabled: session.authenticated,
  });
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

  const createMutation = useMutation({
    mutationFn: () => createOrganizationProject(orgId, form, session.csrfToken),
    onSuccess: async () => {
      setForm({ key: '', name: '', type: 'scrum' });
      await queryClient.invalidateQueries({ queryKey: ['organization-projects', orgId] });
    },
  });

  if (session.loading || projectsQuery.isLoading || membersQuery.isLoading || overviewQuery.isLoading) {
    return <LoadingPageState title="Loading organization projects..." message="Resolving project administration and role assignments." />;
  }

  if (projectsQuery.isError || membersQuery.isError || overviewQuery.isError || !projectsQuery.data || !membersQuery.data || !overviewQuery.data) {
    return <ErrorPageState title="Unable to load organization projects." message="Project administration data is unavailable." />;
  }

  const suspended = overviewQuery.data.status === 'suspended';

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Project administration</p>
        <h2>Projects and role-bound access</h2>
      </div>
      {suspended ? <ReadOnlyBanner title="Organization suspended" message="Project creation and role assignment are disabled while the organization is suspended." /> : null}

      <div className="two-column-grid">
        <section className="panel stack">
          <h3>Create project</h3>
          <div className="form-grid">
            <label className="field">
              <span>Project key</span>
              <input aria-label="Project key" value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value.toUpperCase() }))} />
            </label>
            <label className="field">
              <span>Project name</span>
              <input aria-label="Project name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </label>
            <label className="field">
              <span>Project type</span>
              <select aria-label="Project type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as OrganizationProjectSummary['type'] }))}>
                <option value="scrum">scrum</option>
                <option value="kanban">kanban</option>
              </select>
            </label>
          </div>
          <div className="actions">
            <button className="button" type="button" disabled={createMutation.isPending || !form.key.trim() || !form.name.trim() || suspended} onClick={() => void createMutation.mutateAsync()}>
              Create project
            </button>
          </div>
        </section>

        <section className="panel stack">
          <h3>Organization projects</h3>
          {projectsQuery.data.map((project) => (
            <article className="panel-soft stack" key={project.projectId}>
              <div className="card-row admin-card">
                <div>
                  <h3>
                    {project.key} · {project.name}
                  </h3>
                  <p>
                    {project.type} · {project.status} · {project.memberCount} members
                  </p>
                </div>
                <div className="actions compact-actions">
                  <a className="button button-secondary" href={`/projects/${project.projectId}/board`}>
                    Open board
                  </a>
                </div>
              </div>
              <ProjectMembersSettings
                projectId={project.projectId}
                projectName={project.name}
                orgMembers={membersQuery.data}
                csrfToken={session.csrfToken}
                disabled={suspended || project.status === 'archived'}
              />
              <ArchiveProjectSettings
                project={project}
                csrfToken={session.csrfToken}
                onArchived={async () => {
                  await queryClient.invalidateQueries({ queryKey: ['organization-projects', orgId] });
                }}
              />
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
