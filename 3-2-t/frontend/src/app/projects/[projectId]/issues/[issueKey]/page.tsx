'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useState } from 'react';

import { ErrorPageState, LoadingPageState } from '@/components/state/page-state';
import { ReadOnlyBanner } from '@/components/state/read-only-banner';
import { IssueForm } from '@/features/issues/components/issue-form';
import { IssueTimeline } from '@/features/issues/components/issue-timeline';
import { useSession } from '@/lib/auth/session-context';
import { addComment, getIssue, getIssueTimeline, listIssues, updateIssue } from '@/services/issues/issues-api';
import { listSprints } from '@/services/sprints/sprints-api';

export default function Page() {
  const params = useParams<{ projectId: string; issueKey: string }>();
  const projectId = String(params.projectId);
  const issueKey = String(params.issueKey);
  const session = useSession();
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState('');

  const issueQuery = useQuery({
    queryKey: ['issue-detail', projectId, issueKey],
    queryFn: () => getIssue(projectId, issueKey),
  });
  const issuesQuery = useQuery({
    queryKey: ['project-issues', projectId],
    queryFn: () => listIssues(projectId),
  });
  const sprintsQuery = useQuery({
    queryKey: ['project-sprints', projectId],
    queryFn: () => listSprints(projectId),
  });
  const timelineQuery = useQuery({
    queryKey: ['issue-timeline', projectId, issueKey],
    queryFn: () => getIssueTimeline(projectId, issueKey),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateIssue>[2]) => updateIssue(projectId, issueKey, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['issue-detail', projectId, issueKey] });
      await queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-backlog', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['issue-timeline', projectId, issueKey] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: (body: string) => addComment(projectId, issueKey, body, session.csrfToken),
    onSuccess: async () => {
      setCommentBody('');
      await queryClient.invalidateQueries({ queryKey: ['issue-detail', projectId, issueKey] });
      await queryClient.invalidateQueries({ queryKey: ['issue-timeline', projectId, issueKey] });
    },
  });

  if (issueQuery.isLoading || issuesQuery.isLoading || sprintsQuery.isLoading || timelineQuery.isLoading || session.loading) {
    return <LoadingPageState title="Loading issue detail..." message="Fetching issue fields, related work, and timeline." />;
  }

  if (issueQuery.isError || issuesQuery.isError || sprintsQuery.isError || timelineQuery.isError || !issueQuery.data || !issuesQuery.data || !sprintsQuery.data || !timelineQuery.data) {
    return <ErrorPageState title="Unable to load issue detail." message="Issue data or timeline data could not be loaded." />;
  }

  const issue = issueQuery.data;
  const epicOptions = issuesQuery.data.filter((candidate) => candidate.type === 'epic' && candidate.issueKey !== issue.issueKey);
  const readOnlyMessage = issue.project.organizationStatus === 'suspended'
    ? 'This organization is suspended, so issue edits and comments are disabled.'
    : issue.project.status === 'archived'
      ? 'This project is archived, so issue edits and comments are disabled.'
      : null;
  const readOnly = Boolean(readOnlyMessage);

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Issue detail</p>
        <h2>{issue.issueKey}</h2>
        <p>{issue.title}</p>
      </div>
      {readOnlyMessage ? <ReadOnlyBanner title="Read-only mode" message={readOnlyMessage} /> : null}

      <div className="two-column-grid">
        <section className="panel">
          <h3>Edit issue</h3>
          <IssueForm
            submitLabel="Save issue"
            busy={updateMutation.isPending}
            disabled={readOnly}
            initialValue={{
              type: issue.type,
              title: issue.title,
              description: issue.description ?? '',
              priority: issue.priority,
              estimate: issue.estimate?.toString() ?? '',
              labels: issue.labels.join(', '),
              sprintId: issue.sprint?.id ?? '',
              epicIssueKey: issue.epicIssueKey ?? '',
            }}
            sprintOptions={sprintsQuery.data.map((sprint) => ({ id: sprint.id, name: sprint.name }))}
            epicOptions={epicOptions.map((candidate) => ({ issueKey: candidate.issueKey, title: candidate.title }))}
            onSubmit={async (payload) => {
              await updateMutation.mutateAsync({
                ...payload,
                expectedVersion: issue.updatedVersion,
              });
            }}
          />
        </section>

        <section className="panel stack">
          <h3>Comments</h3>
          {issue.comments.map((comment) => (
            <article className="comment-card" key={comment.id}>
              <strong>{comment.authorUserId}</strong>
              <p>{comment.body}</p>
            </article>
          ))}
          <label className="field">
            <span>Add comment</span>
            <textarea className="textarea" aria-label="Comment body" value={commentBody} disabled={readOnly} onChange={(event) => setCommentBody(event.target.value)} />
          </label>
          <button className="button" type="button" onClick={() => commentMutation.mutate(commentBody)} disabled={commentMutation.isPending || commentBody.trim().length === 0 || readOnly}>
            {commentMutation.isPending ? 'Posting comment...' : 'Add comment'}
          </button>
        </section>
      </div>

      <IssueTimeline entries={timelineQuery.data.timeline} />
    </section>
  );
}
