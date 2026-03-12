'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError } from '../../lib/api-client';
import { OfflineQueuedError } from '../../lib/offline/mutation-queue';
import { getUserFacingErrorMessage, getUserFacingErrorTitle } from '../../lib/errors/user-facing-error';
import { useToast } from '../Toast';
import { useTaskComments, useTaskDetailFromSnapshot } from '../../lib/queries/task';
import { useUpdateTaskMutation } from '../../lib/mutations/update-task';
import { useSetTaskAssigneesMutation } from '../../lib/mutations/set-task-assignees';
import { useChangeTaskStatusMutation } from '../../lib/mutations/change-task-status';
import { useArchiveTaskMutation } from '../../lib/mutations/archive-task';
import { useCreateCommentMutation } from '../../lib/mutations/create-comment';
import TaskEditForm from './TaskEditForm';
import TaskStatusControl, { type TaskStatus } from './TaskStatusControl';
import AssigneesPicker from './AssigneesPicker';
import ArchiveTaskButton from './ArchiveTaskButton';
import Comments from './Comments';
import ConflictDialog from '../errors/ConflictDialog';

export default function TaskPanel({
  projectId,
  taskId,
  onClose,
  canWriteTask,
  canWriteComment,
}: {
  projectId: string;
  taskId: string;
  onClose: () => void;
  canWriteTask: boolean;
  canWriteComment: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { snapshot, task } = useTaskDetailFromSnapshot(projectId, taskId, true);
  const commentsQuery = useTaskComments(projectId, taskId, !!taskId);

  const list = useMemo(() => {
    if (!task) return null;
    return snapshot.data?.lists.find((l) => l.id === task.listId) ?? null;
  }, [snapshot.data?.lists, task]);

  const board = useMemo(() => {
    if (!task) return null;
    return snapshot.data?.boards.find((b) => b.id === task.boardId) ?? null;
  }, [snapshot.data?.boards, task]);

  const readonly =
    !task ||
    snapshot.data?.project.status === 'archived' ||
    board?.status === 'archived' ||
    list?.status === 'archived' ||
    task.status === 'archived' ||
    !canWriteTask;

  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => {
    const ids = (task?.assignees ?? []).map((a) => a.userId);
    setAssigneeIds(ids);
  }, [taskId, task?.assignees]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  async function safe<T>(fn: () => Promise<T>) {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      if (err instanceof OfflineQueuedError) {
        toast({
          variant: 'info',
          title: getUserFacingErrorTitle(err),
          message: getUserFacingErrorMessage(err, '操作失敗'),
        });
        setActionError(getUserFacingErrorMessage(err, '操作失敗'));
        return;
      }
      if (err instanceof ApiError && err.statusCode === 409 && err.code === 'VERSION_CONFLICT') {
        toast({ variant: 'error', title: '資料衝突', message: '偵測到版本衝突，請重新載入後再試一次。' });
        setConflictOpen(true);
        return;
      }

      toast({
        variant: 'error',
        title: getUserFacingErrorTitle(err, '操作失敗'),
        message: getUserFacingErrorMessage(err, '操作失敗'),
      });
      setActionError(getUserFacingErrorMessage(err, '操作失敗'));
    }
  }

  const updateTask = useUpdateTaskMutation(projectId, taskId);
  const setAssignees = useSetTaskAssigneesMutation(projectId, taskId);
  const changeStatus = useChangeTaskStatusMutation(projectId, taskId);
  const archiveTask = useArchiveTaskMutation(projectId, taskId);
  const createComment = useCreateCommentMutation(projectId, taskId);

  const memberships = snapshot.data?.memberships ?? [];

  const currentStatus = (task?.status ?? 'open') as TaskStatus;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <aside className="absolute right-0 top-0 h-full w-full max-w-xl overflow-auto bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-slate-500">Task detail</div>
            <div className="mt-1 break-words text-lg font-semibold text-slate-900" data-testid="task-panel-title">
              {task?.title ?? '—'}
            </div>
            {list ? <div className="mt-1 text-xs text-slate-600">List: {list.title}</div> : null}
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
            onClick={onClose}
            data-testid="task-panel-close"
          >
            關閉
          </button>
        </div>

        <div className="space-y-6 p-4">
          {snapshot.isLoading ? <div className="text-sm text-slate-700">載入中…</div> : null}
          {snapshot.error ? (
            <div className="text-sm text-red-600">
              {getUserFacingErrorMessage(snapshot.error, '載入失敗')}
            </div>
          ) : null}
          {actionError ? <div className="text-sm text-red-600">{actionError}</div> : null}

          {!task ? (
            <div className="text-sm text-slate-700">找不到 task。</div>
          ) : (
            <>
              <TaskEditForm
                initial={{
                  title: task.title,
                  description: task.description ?? null,
                  dueDate: task.dueDate ?? null,
                  priority: task.priority ?? null,
                }}
                readonly={readonly}
                onSave={(patch) => safe(() => updateTask.mutateAsync({ version: task.version, patch }))}
              />

              <TaskStatusControl
                status={currentStatus}
                readonly={readonly}
                onChange={(toStatus) => safe(() => changeStatus.mutateAsync({ version: task.version, toStatus }))}
              />

              <div className="space-y-2">
                <AssigneesPicker
                  memberships={memberships.map((m) => ({ userId: m.userId, role: m.role }))}
                  value={assigneeIds}
                  readonly={readonly}
                  onChange={setAssigneeIds}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 disabled:opacity-50"
                    disabled={readonly || setAssignees.isPending}
                    onClick={() =>
                      safe(async () => {
                        const updated = (await setAssignees.mutateAsync({ version: task.version, assigneeIds })) as {
                          assignees?: Array<{ userId: string }>;
                        };
                        const ids = (updated.assignees ?? []).map((a) => a.userId);
                        setAssigneeIds(ids);
                      })
                    }
                    data-testid="assignees-save"
                  >
                    儲存指派
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end">
                <ArchiveTaskButton
                  disabled={readonly || archiveTask.isPending}
                  onArchive={() => safe(() => archiveTask.mutateAsync({ version: task.version }))}
                />
              </div>

              <Comments
                comments={commentsQuery.data ?? []}
                readonly={readonly || !canWriteComment}
                onCreate={(content) => safe(() => createComment.mutateAsync({ content }))}
              />

              {task.status === 'archived' ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  此 task 已封存（唯讀）。
                </div>
              ) : null}
            </>
          )}
        </div>
      </aside>

      <ConflictDialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        onReload={async () => {
          setConflictOpen(false);
          await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
        }}
      />
    </div>
  );
}
