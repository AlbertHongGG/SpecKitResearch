'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { formatApiError } from '@/lib/api/errors';
import { sanitizeText } from '@/lib/security/sanitize';
import { IssueEditForm } from '@/features/issues/IssueEditForm';
import { TransitionMenu } from '@/features/issues/TransitionMenu';
import { IssueComments } from '@/features/issues/IssueComments';
import { AuditTimeline } from '@/features/audit/AuditTimeline';

type IssueDetail = {
  issueKey: string;
  type: string;
  title: string;
  priority: string;
  statusKey: string;
  createdAt: string;
  updatedAt: string;
  description: string | null;
  labels: string[];
  dueDate: string | null;
  estimate: number | null;
  reporterUserId: string;
  permissions?: {
    canUpdateIssue?: boolean;
    canTransitionIssue?: boolean;
    canComment?: boolean;
  };
};

export default function IssueDetailPage() {
  const params = useParams<{ projectId: string; issueKey: string }>();
  const projectId = params.projectId;
  const issueKey = decodeURIComponent(params.issueKey);

  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ['issue', projectId, issueKey],
    queryFn: async () => apiFetch<{ issue: IssueDetail }>(`/projects/${projectId}/issues/${encodeURIComponent(issueKey)}`),
    retry: false,
  });

  if (q.isLoading) return <LoadingState label="Loading" />;
  if (q.isError) return <ErrorState title="Error" message={formatApiError(q.error)} />;

  const issue = q.data!.issue;
  const canUpdate = issue.permissions?.canUpdateIssue !== false;
  const canTransition = issue.permissions?.canTransitionIssue !== false;
  const canComment = issue.permissions?.canComment !== false;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link href={`/projects/${projectId}/board`} className="text-sm text-slate-600 hover:underline">
          ← Back to board
        </Link>
      </div>

      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-slate-500">{issue.issueKey}</div>
          <h1 className="text-xl font-semibold">{sanitizeText(issue.title)}</h1>
          <div className="text-sm text-slate-600">Status: {issue.statusKey}</div>
        </div>
        {canTransition ? (
          <TransitionMenu
            projectId={projectId}
            issueKey={issue.issueKey}
            statusKey={issue.statusKey}
            expectedVersion={issue.updatedAt}
            onTransitioned={async () => {
              await qc.invalidateQueries({ queryKey: ['issue', projectId, issueKey] });
              await qc.invalidateQueries({ queryKey: ['issues', projectId] });
              await qc.invalidateQueries({ queryKey: ['audit', projectId] });
            }}
          />
        ) : (
          <div className="text-sm text-slate-500">Read-only</div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-700">Edit</h2>
          {canUpdate ? (
            <IssueEditForm
              projectId={projectId}
              issueKey={issue.issueKey}
              initial={issue}
              onSaved={async () => {
                await qc.invalidateQueries({ queryKey: ['issue', projectId, issueKey] });
                await qc.invalidateQueries({ queryKey: ['issues', projectId] });
                await qc.invalidateQueries({ queryKey: ['audit', projectId] });
              }}
            />
          ) : (
            <div className="text-sm text-slate-500">You don’t have permission to edit.</div>
          )}
        </section>

        <section className="rounded border bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-700">Comments</h2>
          <IssueComments
            projectId={projectId}
            issueKey={issue.issueKey}
            canPost={canComment}
            onChanged={async () => {
              await qc.invalidateQueries({ queryKey: ['audit', projectId] });
            }}
          />
        </section>

        <section className="rounded border bg-white p-4 md:col-span-2">
          <h2 className="mb-2 text-sm font-medium text-slate-700">Audit</h2>
          <AuditTimeline projectId={projectId} issueKey={issue.issueKey} />
        </section>
      </div>
    </main>
  );
}
