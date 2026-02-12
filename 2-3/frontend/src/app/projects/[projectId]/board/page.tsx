'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '../../../../components/AppShell';
import { AsyncState } from '../../../../components/AsyncState';
import { useMe } from '../../../../features/auth/useMe';
import { BoardHeader } from '../../../../features/board/BoardHeader';
import { BoardView } from '../../../../features/board/BoardView';
import { useToast } from '../../../../components/Toast';
import { api } from '../../../../lib/api/client';
import { useProjectEvents } from '../../../../features/realtime/useProjectEvents';
import { ArchivedBadge } from '../../../../components/ArchivedBadge';
import { getReadonlyReason } from '../../../../lib/readonly/useReadonlyReason';

export default function ProjectBoardPage({ params }: { params: { projectId: string } }) {
    const { data: me } = useMe();
    const toast = useToast();
    const queryClient = useQueryClient();

    const snapshotQuery = useQuery({
        queryKey: ['snapshot', params.projectId],
        queryFn: () => api.snapshot(params.projectId),
    });

    useProjectEvents({
        projectId: params.projectId,
        enabled: !!snapshotQuery.data,
        after: snapshotQuery.data?.latestEventId ?? null,
    });

    const myRole = useMemo(() => {
        if (!me || !snapshotQuery.data) return null;
        const m = snapshotQuery.data.memberships.find((x) => x.userId === me.id);
        return m?.role ?? null;
    }, [me, snapshotQuery.data]);

    const readonlyReason = useMemo(() => {
        if (!snapshotQuery.data) return null;
        return getReadonlyReason({ project: snapshotQuery.data.project, myRole });
    }, [myRole, snapshotQuery.data]);

    const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

    const derivedActiveBoardId = useMemo(() => {
        if (activeBoardId) return activeBoardId;
        return snapshotQuery.data?.boards[0]?.id ?? null;
    }, [activeBoardId, snapshotQuery.data]);

    const activeLists = useMemo(() => {
        const boardId = derivedActiveBoardId;
        if (!boardId || !snapshotQuery.data) return [];
        return snapshotQuery.data.lists.filter((l) => l.boardId === boardId);
    }, [derivedActiveBoardId, snapshotQuery.data]);

    const activeTasks = useMemo(() => {
        const boardId = derivedActiveBoardId;
        if (!boardId || !snapshotQuery.data) return [];
        return snapshotQuery.data.tasks.filter((t) => t.boardId === boardId && t.status !== 'archived');
    }, [derivedActiveBoardId, snapshotQuery.data]);

    const canManage = !readonlyReason && (myRole === 'owner' || myRole === 'admin');
    const canWrite = !readonlyReason && (myRole === 'owner' || myRole === 'admin' || myRole === 'member');

    const [newListTitle, setNewListTitle] = useState('');
    const createListMutation = useMutation({
        mutationFn: async () => {
            if (!derivedActiveBoardId) throw new Error('No active board');
            return api.createList(derivedActiveBoardId, { title: newListTitle.trim() });
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['snapshot', params.projectId] });
            toast.push('已建立欄位', 'success');
            setNewListTitle('');
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '建立欄位失敗', 'error'),
    });

    return (
        <AppShell>
            <AsyncState
                isLoading={snapshotQuery.isLoading}
                error={snapshotQuery.error}
                empty={false}
            >
                {snapshotQuery.data ? (
                    <>
                        <div className="mb-4">
                            <div className="text-sm text-slate-600">專案</div>
                            <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
                                {snapshotQuery.data.project.name}
                                {snapshotQuery.data.project.status === 'archived' ? <ArchivedBadge /> : null}
                            </div>
                            {readonlyReason ? <div className="mt-1 text-sm text-amber-700">{readonlyReason}</div> : null}
                        </div>

                        <BoardHeader
                            projectId={params.projectId}
                            boards={snapshotQuery.data.boards}
                            activeBoardId={derivedActiveBoardId}
                            onSelectBoardId={(id) => setActiveBoardId(id)}
                            canManageBoards={canManage}
                        />

                        {derivedActiveBoardId ? (
                            <>
                                {canManage ? (
                                    <div className="mt-4 rounded-lg border bg-white p-4">
                                        <div className="text-sm font-medium">建立欄位</div>
                                        <div className="mt-2 flex gap-2">
                                            <input
                                                className="w-full rounded border px-3 py-2 text-sm"
                                                placeholder="例如：To Do"
                                                value={newListTitle}
                                                onChange={(e) => setNewListTitle(e.target.value)}
                                            />
                                            <button
                                                type="button"
                                                className="rounded bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                                                disabled={!newListTitle.trim() || createListMutation.isPending}
                                                onClick={() => createListMutation.mutate()}
                                            >
                                                {createListMutation.isPending ? '建立中…' : '建立'}
                                            </button>
                                        </div>
                                    </div>
                                ) : null}

                                <BoardView
                                    projectId={params.projectId}
                                    lists={activeLists}
                                    tasks={activeTasks}
                                    canWrite={canWrite}
                                    canManageWip={canManage}
                                />
                            </>
                        ) : (
                            <div className="mt-4 rounded-lg border bg-white p-6 text-sm text-slate-600">
                                目前尚無看板。{canManage ? '你可以先建立一個看板。' : '請聯絡 Owner/Admin 建立看板。'}
                            </div>
                        )}
                    </>
                ) : null}
            </AsyncState>
        </AppShell>
    );
}
