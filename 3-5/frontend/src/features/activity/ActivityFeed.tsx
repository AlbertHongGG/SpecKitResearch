'use client';

import { useInfiniteQuery } from '@tanstack/react-query';

import { api, type ActivityEvent } from '../../lib/api/client';
import { formatDateTime } from '../../lib/dates';

function ActivityRow(props: { e: ActivityEvent }) {
    return (
        <div className="border-t px-4 py-3">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-xs text-slate-600">{formatDateTime(props.e.timestamp)}</div>
                    <div className="mt-1 text-sm">
                        <span className="font-mono text-xs text-slate-700">{props.e.actorId}</span>{' '}
                        <span className="text-slate-700">{props.e.entityType}</span>{' '}
                        <span className="text-slate-900">{props.e.action}</span>
                    </div>
                    <pre className="mt-2 overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
                        {JSON.stringify(props.e.metadata ?? {}, null, 2)}
                    </pre>
                </div>
                <div className="text-[10px] text-slate-500">{props.e.entityId}</div>
            </div>
        </div>
    );
}

export function ActivityFeed(props: { projectId: string }) {
    const query = useInfiniteQuery({
        queryKey: ['activity', props.projectId],
        queryFn: ({ pageParam }) => api.activity(props.projectId, { cursor: pageParam as string | undefined, limit: 50 }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (last) => last.nextCursor ?? undefined,
    });

    const events = query.data?.pages.flatMap((p) => p.events) ?? [];

    return (
        <div className="rounded-lg border bg-white">
            <div className="border-b px-4 py-3">
                <div className="text-sm font-medium">Activity</div>
            </div>

            {events.length ? (
                <div>{events.map((e) => <ActivityRow key={e.id} e={e} />)}</div>
            ) : (
                <div className="p-4 text-sm text-slate-600">尚無活動紀錄。</div>
            )}

            <div className="border-t p-4">
                <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm disabled:opacity-60"
                    disabled={!query.hasNextPage || query.isFetchingNextPage}
                    onClick={() => query.fetchNextPage()}
                >
                    {query.isFetchingNextPage ? '載入中…' : query.hasNextPage ? '載入更多' : '沒有更多了'}
                </button>
            </div>
        </div>
    );
}
