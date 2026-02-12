'use client';

import { useQuery } from '@tanstack/react-query';

import { AppShell } from '../../../../components/AppShell';
import { AsyncState } from '../../../../components/AsyncState';
import { api } from '../../../../lib/api/client';
import { ActivityFeed } from '../../../../features/activity/ActivityFeed';
import { useProjectEvents } from '../../../../features/realtime/useProjectEvents';

export default function ProjectActivityPage({ params }: { params: { projectId: string } }) {
    const snapshotQuery = useQuery({
        queryKey: ['snapshot', params.projectId],
        queryFn: () => api.snapshot(params.projectId),
    });

    useProjectEvents({
        projectId: params.projectId,
        enabled: !!snapshotQuery.data,
        after: snapshotQuery.data?.latestEventId ?? null,
    });

    return (
        <AppShell>
            <AsyncState isLoading={snapshotQuery.isLoading} error={snapshotQuery.error} empty={false}>
                {snapshotQuery.data ? (
                    <>
                        <div className="mb-4">
                            <div className="text-sm text-slate-600">專案</div>
                            <div className="mt-1 text-xl font-semibold">{snapshotQuery.data.project.name}</div>
                        </div>

                        <ActivityFeed projectId={params.projectId} />
                    </>
                ) : null}
            </AsyncState>
        </AppShell>
    );
}
