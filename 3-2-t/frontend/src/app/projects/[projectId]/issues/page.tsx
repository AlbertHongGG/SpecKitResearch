'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { IssueForm } from '@/features/issues/components/issue-form';
import { useSession } from '@/lib/auth/session-context';
import { createIssue, listIssues } from '@/services/issues/issues-api';
import { listSprints } from '@/services/sprints/sprints-api';

export default function Page() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const session = useSession();
  const queryClient = useQueryClient();

  const issuesQuery = useQuery({
    queryKey: ['project-issues', projectId],
    queryFn: () => listIssues(projectId),
  });
  const sprintsQuery = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => listSprints(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createIssue>[1]) => createIssue(projectId, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
    },
  });

  if (issuesQuery.isLoading || sprintsQuery.isLoading || session.loading) {
    return <main className="panel">Loading issues...</main>;
  }

  if (issuesQuery.isError || sprintsQuery.isError || !issuesQuery.data || !sprintsQuery.data) {
    return <main className="panel">Unable to load project issues.</main>;
  }

  const epicOptions = issuesQuery.data.filter((issue) => issue.type === 'epic');

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Project issues</p>
        <h2>Create and govern work items</h2>
      </div>

      <div className="two-column-grid">
        <section className="panel">
          <h3>Create issue</h3>
          <IssueForm
            submitLabel="Create issue"
            busy={createMutation.isPending}
            sprintOptions={sprintsQuery.data.map((sprint) => ({ id: sprint.id, name: sprint.name }))}
            epicOptions={epicOptions.map((issue) => ({ issueKey: issue.issueKey, title: issue.title }))}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
          />
        </section>

        <section className="panel stack">
          <h3>Open issues</h3>
          {issuesQuery.data.map((issue) => (
            <article className="issue-card" key={issue.id}>
              <div className="meta-row">
                <strong>{issue.issueKey}</strong>
                <span className="pill">{issue.status.name}</span>
              </div>
              <p>{issue.title}</p>
              <small>{issue.labels.join(', ') || 'No labels yet'}</small>
              <div className="actions">
                <a className="button-secondary" href={`/projects/${projectId}/issues/${issue.issueKey}`}>
                  Open detail
                </a>
              </div>
            </article>
          ))}
        </section>
      </div>
    </section>
  );
}
