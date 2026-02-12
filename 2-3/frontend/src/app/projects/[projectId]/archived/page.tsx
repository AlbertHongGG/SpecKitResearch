'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AppShell } from '../../../../components/AppShell';
import { AsyncState } from '../../../../components/AsyncState';
import { ArchivedBadge } from '../../../../components/ArchivedBadge';
import { api } from '../../../../lib/api/client';
import { useMe } from '../../../../features/auth/useMe';
import { useToast } from '../../../../components/Toast';

export default function ProjectArchivedPage({ params }: { params: { projectId: string } }) {
    const toast = useToast();
    const queryClient = useQueryClient();
    const { data: me } = useMe();

    const snapshotQuery = useQuery({
        queryKey: ['snapshot', params.projectId],
        queryFn: () => api.snapshot(params.projectId),
    });

    const myRole = useMemo(() => {
        if (!me || !snapshotQuery.data) return null;
        const m = snapshotQuery.data.memberships.find((x) => x.userId === me.id);
        return m?.role ?? null;
    }, [me, snapshotQuery.data]);

    const archiveProject = useMutation({
        mutationFn: async () => api.archiveProject(params.projectId),
        onSuccess: async () => {
            toast.push('已封存專案', 'info');
            await queryClient.invalidateQueries({ queryKey: ['snapshot', params.projectId] });
        },
        onError: (err) => toast.push(err instanceof Error ? err.message : '封存失敗', 'error'),
    });

    return (
        <AppShell>
            <AsyncState isLoading={snapshotQuery.isLoading} error={snapshotQuery.error} empty={false}>
                {snapshotQuery.data ? (
                    <>
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <div className="text-sm text-slate-600">專案</div>
                                <div className="mt-1 flex items-center gap-2 text-xl font-semibold">
                                    {snapshotQuery.data.project.name}
                                    {snapshotQuery.data.project.status === 'archived' ? <ArchivedBadge /> : null}
                                </div>
                            </div>

                            {myRole === 'owner' && snapshotQuery.data.project.status !== 'archived' ? (
                                <button
                                    type="button"
                                    className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                                    disabled={archiveProject.isPending}
                                    onClick={() => archiveProject.mutate()}
                                >
                                    {archiveProject.isPending ? '封存中…' : '封存專案'}
                                </button>
                            ) : null}
                        </div>

                        <div className="grid gap-4">
                            <div className="rounded-lg border bg-white">
                                <div className="border-b px-4 py-3 text-sm font-medium">Archived Boards</div>
                                <div className="p-4 text-sm">
                                    {snapshotQuery.data.boards.filter((b) => b.status === 'archived').length ? (
                                        <ul className="list-disc pl-5">
                                            {snapshotQuery.data.boards
                                                .filter((b) => b.status === 'archived')
                                                .sort((a, b) => a.order - b.order)
                                                .map((b) => (
                                                    <li key={b.id}>
                                                        <span className="font-medium">{b.name}</span> <span className="font-mono text-xs text-slate-600">{b.id}</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <div className="text-slate-600">沒有 archived boards。</div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-white">
                                <div className="border-b px-4 py-3 text-sm font-medium">Archived Lists</div>
                                <div className="p-4 text-sm">
                                    {snapshotQuery.data.lists.filter((l) => l.status === 'archived').length ? (
                                        <ul className="list-disc pl-5">
                                            {snapshotQuery.data.lists
                                                .filter((l) => l.status === 'archived')
                                                .sort((a, b) => a.order - b.order)
                                                .map((l) => (
                                                    <li key={l.id}>
                                                        <span className="font-medium">{l.title}</span> <span className="font-mono text-xs text-slate-600">{l.id}</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <div className="text-slate-600">沒有 archived lists。</div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-lg border bg-white">
                                <div className="border-b px-4 py-3 text-sm font-medium">Archived Tasks</div>
                                <div className="p-4 text-sm">
                                    {snapshotQuery.data.tasks.filter((t) => t.status === 'archived').length ? (
                                        <ul className="list-disc pl-5">
                                            {snapshotQuery.data.tasks
                                                .filter((t) => t.status === 'archived')
                                                .sort((a, b) => a.updatedAt?.localeCompare(b.updatedAt ?? '') ?? 0)
                                                .map((t) => (
                                                    <li key={t.id}>
                                                        <span className="font-medium">{t.title}</span> <span className="font-mono text-xs text-slate-600">{t.id}</span>
                                                    </li>
                                                ))}
                                        </ul>
                                    ) : (
                                        <div className="text-slate-600">沒有 archived tasks。</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : null}
            </AsyncState>
        </AppShell>
    );
}
