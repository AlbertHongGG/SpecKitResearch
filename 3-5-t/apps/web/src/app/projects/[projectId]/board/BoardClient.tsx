'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { getUserFacingErrorMessage } from '../../../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../../../lib/require-auth';
import { hasPermission, useMyMembership } from '../../../../lib/use-membership';
import { useMoveTaskMutation, type Task } from '../../../../lib/mutations/move-task';
import { useProjectRealtime } from '../../../../lib/realtime/use-project-realtime';
import {
  ArchiveControls,
  BoardHeader,
  CreateBoardForm,
  CreateListForm,
  ListColumn,
  ListReorder,
  TaskDnd,
} from '../../../../components/board/index';
import TaskPanel from '../../../../components/task/TaskPanel';
import ConflictDialog from '../../../../components/errors/ConflictDialog';
import WipOverrideDialog from '../../../../components/board/WipOverrideDialog';

type Snapshot = {
  project: {
    id: string;
    name: string;
    status: 'active' | 'archived';
    version: number;
  };
  boards: Array<{
    id: string;
    projectId: string;
    name: string;
    order: number;
    status: 'active' | 'archived';
    version: number;
  }>;
  lists: Array<{
    id: string;
    boardId: string;
    title: string;
    order: number;
    status: 'active' | 'archived';
    isWipLimited: boolean;
    wipLimit: number | null;
    version: number;
  }>;
  tasks: Task[];
  memberships: Array<{
    id: string;
    projectId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member' | 'viewer';
    version: number;
    joinedAt: string;
  }>;
};

export default function BoardClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  useRequireAuth();
  const { memberships, role, isProjectAccessError } = useMyMembership(projectId);

  useEffect(() => {
    if (isProjectAccessError) {
      router.replace('/403');
    }
    const err = memberships.error;
    if (err instanceof ApiError && err.statusCode >= 500) {
      router.replace('/5xx');
    }
  }, [isProjectAccessError, memberships.error, router]);

  const snapshot = useQuery({
    queryKey: ['projects', projectId, 'snapshot'],
    enabled: !isProjectAccessError,
    queryFn: async () => {
      const res = await apiFetch<Snapshot>(`/projects/${projectId}/snapshot`, { method: 'GET' });
      return res.data as Snapshot;
    },
  });

  const activeBoards = useMemo(() => {
    const boards = snapshot.data?.boards ?? [];
    return boards.filter((b) => b.status === 'active').sort((a, b) => a.order - b.order);
  }, [snapshot.data?.boards]);

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedBoardId) return;
    const first = activeBoards[0];
    if (first) setSelectedBoardId(first.id);
  }, [activeBoards, selectedBoardId]);

  const selectedBoard = useMemo(() => {
    if (!selectedBoardId) return null;
    return (snapshot.data?.boards ?? []).find((b) => b.id === selectedBoardId) ?? null;
  }, [selectedBoardId, snapshot.data?.boards]);

  const listsForSelectedBoard = useMemo(() => {
    const lists = snapshot.data?.lists ?? [];
    if (!selectedBoardId) return [];
    return lists
      .filter((l) => l.boardId === selectedBoardId && l.status === 'active')
      .slice()
      .sort((a, b) => a.order - b.order);
  }, [selectedBoardId, snapshot.data?.lists]);

  const projectIsArchived = snapshot.data?.project.status === 'archived';
  const boardIsArchived = selectedBoard?.status === 'archived';
  const isReadonly = !!projectIsArchived || !!boardIsArchived;
  const canWriteBoard = hasPermission(role, 'board:write');
  const canWriteList = hasPermission(role, 'list:write');
  const canWriteTask = hasPermission(role, 'task:write');
  const canWriteComment = hasPermission(role, 'comment:write');
  const canOverrideWip = hasPermission(role, 'wip:override');
  const canChangeWip = role === 'owner' || role === 'admin';

  useProjectRealtime(projectId, hasPermission(role, 'realtime:connect') && !isProjectAccessError);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedTaskId(null);
  }, [selectedBoardId]);

  const createBoard = useMutation({
    mutationFn: async (values: { name: string }) => {
      const res = await apiFetch(`/projects/${projectId}/boards`, { method: 'POST', json: values });
      return res.data as any;
    },
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
      setSelectedBoardId(created.id);
    },
  });

  const createList = useMutation({
    mutationFn: async (values: { boardId: string; title: string }) => {
      const res = await apiFetch(`/projects/${projectId}/lists`, { method: 'POST', json: values });
      return res.data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const reorderLists = useMutation({
    mutationFn: async (values: { boardId: string; orderedListIds: string[] }) => {
      const res = await apiFetch(`/projects/${projectId}/boards/${values.boardId}/lists/reorder`, {
        method: 'POST',
        json: { orderedListIds: values.orderedListIds },
      });
      return res.data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const updateList = useMutation({
    mutationFn: async (values: { listId: string; version: number; patch: any }) => {
      const res = await apiFetch(`/projects/${projectId}/lists/${values.listId}`, {
        method: 'PATCH',
        json: { version: values.version, ...values.patch },
      });
      return res.data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const archiveBoard = useMutation({
    mutationFn: async (values: { boardId: string; version: number }) => {
      const res = await apiFetch(`/projects/${projectId}/boards/${values.boardId}/archive`, {
        method: 'POST',
        json: { version: values.version, reason: 'archived' },
      });
      return res.data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const archiveList = useMutation({
    mutationFn: async (values: { listId: string; version: number }) => {
      const res = await apiFetch(`/projects/${projectId}/lists/${values.listId}/archive`, {
        method: 'POST',
        json: { version: values.version, reason: 'archived' },
      });
      return res.data as any;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const createTask = useMutation({
    mutationFn: async (values: { boardId: string; listId: string; title: string }) => {
      const res = await apiFetch(`/projects/${projectId}/tasks`, {
        method: 'POST',
        json: { boardId: values.boardId, listId: values.listId, title: values.title, description: null },
      });
      return res.data as Task;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
    },
  });

  const moveTask = useMoveTaskMutation(projectId);

  const [actionError, setActionError] = useState<string | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);

  const [wipOverrideOpen, setWipOverrideOpen] = useState(false);
  const [wipLimit, setWipLimit] = useState<number | null>(null);
  const [wipCurrentCount, setWipCurrentCount] = useState<number | null>(null);
  const [pendingMove, setPendingMove] = useState<{
    taskId: string;
    toListId: string;
    beforeTaskId: string | null;
    afterTaskId: string | null;
    expectedVersion: number;
  } | null>(null);

  async function safe<T>(fn: () => Promise<T>) {
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(getUserFacingErrorMessage(err, '操作失敗'));
    }
  }

  return (
    <div className="space-y-6">
      <BoardHeader
        projectName={snapshot.data?.project.name ?? '—'}
        role={role}
        boards={activeBoards}
        selectedBoardId={selectedBoardId}
        onSelectBoard={setSelectedBoardId}
      />

      {snapshot.isLoading ? <p className="text-slate-700">載入中…</p> : null}
      {snapshot.error ? (
        <p className="text-sm text-red-600">{getUserFacingErrorMessage(snapshot.error, '載入失敗')}</p>
      ) : null}
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}

      {snapshot.data?.project.status === 'archived' ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          此專案已封存，所有寫入皆為唯讀。
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold" data-testid="board-heading">
            看板
          </h1>

          {selectedBoard ? (
            <ArchiveControls
              kind="board"
              disabled={!canWriteBoard || isReadonly || archiveBoard.isPending}
              onArchive={() =>
                safe(() => archiveBoard.mutateAsync({ boardId: selectedBoard.id, version: selectedBoard.version }))
              }
            />
          ) : null}
        </div>

        {activeBoards.length === 0 ? (
          <div className="mt-4">
            <p className="text-slate-700">目前沒有任何看板。先建立一個吧。</p>
            <div className="mt-3">
              <CreateBoardForm
                disabled={!canWriteBoard || projectIsArchived || createBoard.isPending}
                onSubmit={(values) => safe(() => createBoard.mutateAsync(values))}
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <CreateBoardForm
                disabled={!canWriteBoard || projectIsArchived || createBoard.isPending}
                compact
                onSubmit={(values) => safe(() => createBoard.mutateAsync(values))}
              />

              {selectedBoard ? (
                <CreateListForm
                  boardId={selectedBoard.id}
                  disabled={!canWriteList || isReadonly || createList.isPending}
                  onSubmit={(values) => safe(() => createList.mutateAsync(values))}
                />
              ) : null}
            </div>

            {selectedBoard && selectedBoard.status === 'archived' ? (
              <p className="text-sm text-slate-700">此看板已封存（唯讀）。</p>
            ) : null}

            {selectedBoard ? (
              <ListReorder
                lists={listsForSelectedBoard}
                disabled={!canWriteList || isReadonly || reorderLists.isPending}
                onReorder={(orderedListIds) =>
                  safe(() => reorderLists.mutateAsync({ boardId: selectedBoard.id, orderedListIds }))
                }
              />
            ) : null}

            {listsForSelectedBoard.length === 0 ? (
              <p className="text-slate-700">此看板還沒有任何 list。</p>
            ) : (
              <TaskDnd
                lists={listsForSelectedBoard}
                tasks={((snapshot.data?.tasks ?? []) as Task[]).filter(
                  (t) => t.boardId === selectedBoardId && t.status !== 'archived'
                )}
                readonly={isReadonly || !canWriteTask}
                canWriteTask={canWriteTask}
                onSelectTask={(taskId) => setSelectedTaskId(taskId)}
                onCreateTask={(listId, title) => {
                  if (!selectedBoardId) return;
                  return safe(() => createTask.mutateAsync({ boardId: selectedBoardId, listId, title }));
                }}
                onMove={async ({ taskId, toListId, beforeTaskId, afterTaskId }) => {
                  const task = ((snapshot.data?.tasks ?? []) as Task[]).find((t) => t.id === taskId);
                  if (!task) return;

                  const input = {
                    taskId,
                    toListId,
                    beforeTaskId,
                    afterTaskId,
                    expectedVersion: task.version,
                  };

                  setActionError(null);
                  try {
                    await moveTask.mutateAsync(input);
                  } catch (err) {
                    if (err instanceof ApiError && err.statusCode === 409 && err.code === 'WIP_LIMIT_EXCEEDED') {
                      if (!canOverrideWip) {
                        setActionError('WIP 超限，且你沒有 override 權限。');
                        return;
                      }
                      const details: any = err.details;
                      setWipLimit(typeof details?.wipLimit === 'number' ? details.wipLimit : null);
                      setWipCurrentCount(typeof details?.currentActiveCount === 'number' ? details.currentActiveCount : null);
                      setPendingMove(input);
                      setWipOverrideOpen(true);
                      return;
                    }

                    if (err instanceof ApiError && err.statusCode === 409 && err.code === 'VERSION_CONFLICT') {
                      setConflictOpen(true);
                      return;
                    }

                    setActionError(getUserFacingErrorMessage(err, '操作失敗'));
                  }
                }}
                renderList={(list, taskColumn) => {
                  const full = listsForSelectedBoard.find((l) => l.id === list.id);
                  if (!full) return taskColumn;
                  return (
                    <ListColumn
                      key={full.id}
                      list={full}
                      readonly={!canWriteList || isReadonly}
                      canChangeWip={canChangeWip}
                      onRename={(title) =>
                        safe(() => updateList.mutateAsync({ listId: full.id, version: full.version, patch: { title } }))
                      }
                      onChangeWip={(patch) =>
                        safe(() => updateList.mutateAsync({ listId: full.id, version: full.version, patch }))
                      }
                      onArchive={() => safe(() => archiveList.mutateAsync({ listId: full.id, version: full.version }))}
                    >
                      {taskColumn}
                    </ListColumn>
                  );
                }}
              />
            )}
          </div>
        )}
      </section>

      {selectedTaskId ? (
        <TaskPanel
          projectId={projectId}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          canWriteTask={canWriteTask && !isReadonly}
          canWriteComment={canWriteComment && !isReadonly}
        />
      ) : null}

      <ConflictDialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        onReload={async () => {
          setConflictOpen(false);
          await queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'snapshot'] });
        }}
      />

      <WipOverrideDialog
        open={wipOverrideOpen}
        wipLimit={wipLimit}
        currentActiveCount={wipCurrentCount}
        onClose={() => {
          setWipOverrideOpen(false);
          setPendingMove(null);
        }}
        onConfirm={async ({ reason }) => {
          if (!pendingMove) return;
          setWipOverrideOpen(false);
          try {
            await moveTask.mutateAsync({
              ...pendingMove,
              wipOverride: { enabled: true, reason },
            });
          } catch (err) {
            setActionError(getUserFacingErrorMessage(err, '操作失敗'));
          } finally {
            setPendingMove(null);
          }
        }}
      />

      <button
        className="text-sm text-slate-700 underline"
        onClick={() => router.push(`/projects/${projectId}/archived`)}
      >
        前往封存列表 →
      </button>
    </div>
  );
}
