'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '../../components/AppShell';
import { AsyncState } from '../../components/AsyncState';
import { api } from '../../lib/api/client';
import { CreateProjectModal } from '../../features/projects/CreateProjectModal';
import { InvitationsPanel } from '../../features/projects/InvitationsPanel';

export default function ProjectsPage() {
    const query = useQuery({
        queryKey: ['myProjects'],
        queryFn: () => api.myProjects(),
    });

    return (
        <AppShell>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold">專案</h1>
                    <p className="mt-1 text-sm text-slate-600">你的專案與邀請。</p>
                </div>
                <CreateProjectModal />
            </div>

            <div className="mt-6">
                <AsyncState
                    isLoading={query.isLoading}
                    error={query.error}
                    empty={query.data ? query.data.projects.length === 0 : false}
                    emptyLabel="尚無專案。你可以先建立一個。"
                >
                    <div className="grid gap-3">
                        {query.data?.projects.map((p) => (
                            <Link
                                key={p.project.id}
                                href={`/projects/${p.project.id}/board`}
                                className="rounded-lg border bg-white p-4 hover:bg-slate-50"
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <div className="font-medium">{p.project.name}</div>
                                        {p.project.description ? (
                                            <div className="mt-1 text-sm text-slate-600">{p.project.description}</div>
                                        ) : null}
                                    </div>
                                    <div className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">{p.role}</div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </AsyncState>
            </div>

            <div className="mt-10">
                <h2 className="text-base font-semibold">邀請</h2>
                <div className="mt-2">
                    <InvitationsPanel invitations={query.data?.invitations ?? []} />
                </div>
            </div>
        </AppShell>
    );
}
