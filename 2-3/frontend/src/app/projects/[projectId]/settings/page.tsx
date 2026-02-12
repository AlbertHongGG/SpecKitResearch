'use client';

import { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { AppShell } from '../../../../components/AppShell';
import { AsyncState } from '../../../../components/AsyncState';
import { useMe } from '../../../../features/auth/useMe';
import { api } from '../../../../lib/api/client';
import { ProjectSettingsForm } from '../../../../features/projects/ProjectSettingsForm';

export default function ProjectSettingsPage({ params }: { params: { projectId: string } }) {
    const router = useRouter();
    const { data: me } = useMe();

    const snapshotQuery = useQuery({
        queryKey: ['snapshot', params.projectId],
        queryFn: () => api.snapshot(params.projectId),
    });

    const myRole = useMemo(() => {
        if (!me || !snapshotQuery.data) return null;
        return snapshotQuery.data.memberships.find((m) => m.userId === me.id)?.role ?? null;
    }, [me, snapshotQuery.data]);

    useEffect(() => {
        if (myRole && myRole !== 'owner') router.replace('/403');
    }, [myRole, router]);

    return (
        <AppShell>
            <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold">設定</h1>
                    <div className="mt-1 text-sm text-slate-600">
                        <Link className="underline" href={`/projects/${params.projectId}/board`}>
                            返回看板
                        </Link>
                    </div>
                </div>
            </div>

            <AsyncState isLoading={snapshotQuery.isLoading} error={snapshotQuery.error} empty={false}>
                {snapshotQuery.data && myRole === 'owner' ? (
                    <ProjectSettingsForm project={snapshotQuery.data.project} />
                ) : null}
            </AsyncState>
        </AppShell>
    );
}
