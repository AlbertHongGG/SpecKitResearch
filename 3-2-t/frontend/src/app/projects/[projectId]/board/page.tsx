'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { BoardColumn } from '@/features/issues/components/board-column';
import { WorkflowEditor } from '@/features/workflows/components/workflow-editor';
import { useSession } from '@/lib/auth/session-context';
import { getBoard, transitionIssue, type IssueRecord } from '@/services/issues/issues-api';
import { getWorkflow, updateWorkflow } from '@/services/workflows/workflows-api';

export default function Page() {
  const params = useParams<{ projectId: string }>();
  const projectId = String(params.projectId);
  const session = useSession();
  const queryClient = useQueryClient();

  const boardQuery = useQuery({
    queryKey: ['project-board', projectId],
    queryFn: () => getBoard(projectId),
  });
  const workflowQuery = useQuery({
    queryKey: ['workflow', projectId],
    queryFn: () => getWorkflow(projectId),
  });

  const transitionMutation = useMutation({
    mutationFn: ({ issue, nextStatusKey }: { issue: IssueRecord; nextStatusKey: string }) =>
      transitionIssue(projectId, issue.issueKey, { expectedVersion: issue.updatedVersion, toStatusKey: nextStatusKey }, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['project-issues', projectId] });
    },
  });

  const workflowMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateWorkflow>[1]) => updateWorkflow(projectId, payload, session.csrfToken),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-board', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['workflow', projectId] });
    },
  });

  if (boardQuery.isLoading || workflowQuery.isLoading || session.loading) {
    return <main className="panel">Loading board...</main>;
  }

  if (boardQuery.isError || workflowQuery.isError || !boardQuery.data || !workflowQuery.data) {
    return <main className="panel">Unable to load board data.</main>;
  }

  return (
    <section className="stack">
      <div className="panel hero-panel">
        <p className="eyebrow">Issue lifecycle governance</p>
        <h2>{boardQuery.data.project.name} board</h2>
        <p>
          {boardQuery.data.activeSprint
            ? `Active sprint: ${boardQuery.data.activeSprint.name}`
            : 'No active sprint. Board currently shows backlog-wide work.'}
        </p>
      </div>

      <WorkflowEditor
        workflow={workflowQuery.data}
        busy={workflowMutation.isPending}
        onSubmit={async (payload) => {
          await workflowMutation.mutateAsync(payload);
        }}
      />

      <div className="board-grid">
        {boardQuery.data.columns.map((column, index) => (
          <BoardColumn
            key={column.key}
            title={column.name}
            issues={column.issues}
            nextStatus={boardQuery.data.columns[index + 1] ? { key: boardQuery.data.columns[index + 1].key, name: boardQuery.data.columns[index + 1].name } : null}
            onMove={async (issue, nextStatusKey) => {
              await transitionMutation.mutateAsync({ issue, nextStatusKey });
            }}
          />
        ))}
      </div>
    </section>
  );
}
