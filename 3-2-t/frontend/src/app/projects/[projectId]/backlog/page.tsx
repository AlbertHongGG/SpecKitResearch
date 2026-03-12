'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { IssueForm } from '@/features/issues/components/issue-form';
import { useSession } from '@/lib/auth/session-context';
import { createIssue, getBacklog } from '@/services/issues/issues-api';

export default function Page() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const session = useSession();
  const queryClient = useQueryClient();

  const backlogQuery = useQuery({
    queryKey: ['project-backlog', projectId],
    queryFn: () => getBacklog(projectId),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Parameters<typeof createIssue>[1]) => createIssue(projectId, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] });
    },
  });

  if (backlogQuery.isLoading || session.loading) {
    return <main className="panel">Loading backlog...</main>;
  }

  if (backlogQuery.isError || !backlogQuery.data) {
    return <main className="panel">Unable to load backlog.</main>;
  }

  const epicOptions = [...backlogQuery.data.backlogIssues, ...backlogQuery.data.sprints.flatMap((sprint) => sprint.issues)].filter((issue) => issue.type === 'epic');

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Scrum backlog</p>
        <h2>{backlogQuery.data.project.name}</h2>
      </div>

      <div className="two-column-grid">
        <section className="panel">
          <h3>Create backlog item</h3>
          <IssueForm
            submitLabel="Create backlog issue"
            busy={createMutation.isPending}
            sprintOptions={backlogQuery.data.sprints.map((sprint) => ({ id: sprint.id, name: sprint.name }))}
            epicOptions={epicOptions.map((issue) => ({ issueKey: issue.issueKey, title: issue.title }))}
            onSubmit={async (payload) => {
              await createMutation.mutateAsync(payload);
            }}
          />
        </section>

        <section className="panel stack">
          <h3>Backlog</h3>
          {backlogQuery.data.backlogIssues.map((issue) => (
            <article className="issue-card" key={issue.id}>
              <strong>{issue.issueKey}</strong>
              <p>{issue.title}</p>
            </article>
          ))}
        </section>
      </div>

      <section className="stack">
        {backlogQuery.data.sprints.map((sprint) => (
          <article className="panel" key={sprint.id}>
            <div className="meta-row">
              <h3>{sprint.name}</h3>
              <span className="pill">{sprint.status}</span>
            </div>
            <p>{sprint.goal ?? 'No sprint goal set.'}</p>
            <div className="stack compact-stack">
              {sprint.issues.map((issue) => (
                <div className="issue-card" key={issue.id}>
                  <strong>{issue.issueKey}</strong>
                  <p>{issue.title}</p>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
