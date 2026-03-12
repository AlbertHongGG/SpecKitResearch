'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { ErrorState, LoadingState } from '@/components/PageStates';
import { CreateIssueDialog } from '@/features/issues/CreateIssueDialog';
import { formatApiError } from '@/lib/api/errors';
import { KanbanBoard } from '@/features/board/KanbanBoard';

type IssueSummary = {
  issueKey: string;
  type: string;
  title: string;
  priority: string;
  statusKey: string;
  createdAt: string;
  updatedAt: string;
};

type Workflow = {
  statuses: Array<{ key: string; name: string; position: number }>;
  transitions: Array<{ fromStatusKey: string; toStatusKey: string }>;
};

export default function BoardPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  const workflowQ = useQuery({
    queryKey: ['workflow', projectId],
    queryFn: async () => apiFetch<{ workflow: Workflow }>(`/projects/${projectId}/workflows`),
    retry: false,
  });

  const issuesQ = useQuery({
    queryKey: ['issues', projectId],
    queryFn: async () =>
      apiFetch<{ issues: IssueSummary[]; nextCursor: string | null; permissions?: { canCreateIssue?: boolean } }>(
        `/projects/${projectId}/issues?sort=created_at&limit=50`,
      ),
    retry: false,
  });

  if (workflowQ.isLoading || issuesQ.isLoading) return <LoadingState label="Loading" />;
  if (workflowQ.isError) return <ErrorState title="Error" message={formatApiError(workflowQ.error)} />;
  if (issuesQ.isError) return <ErrorState title="Error" message={formatApiError(issuesQ.error)} />;

  const issues = issuesQ.data?.issues ?? [];
  const canCreateIssue = issuesQ.data?.permissions?.canCreateIssue !== false;
  const workflow = workflowQ.data!.workflow;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Board</h1>
        {canCreateIssue ? <CreateIssueDialog projectId={projectId} /> : <div className="text-sm text-slate-500">Read-only</div>}
      </div>

      <KanbanBoard projectId={projectId} workflow={workflow} issues={issues} />
    </main>
  );
}
