'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ApiError, apiFetch } from '../../../../lib/api-client';
import { getUserFacingErrorMessage } from '../../../../lib/errors/user-facing-error';
import { useRequireAuth } from '../../../../lib/require-auth';
import { useMyMembership } from '../../../../lib/use-membership';

type ActivityLogEntry = {
  id: string;
  projectId: string;
  actorId: string;
  entityType: string;
  entityId: string;
  action: string;
  timestamp: string;
  metadata?: unknown;
};

type ListActivityResponse = {
  items: ActivityLogEntry[];
  nextCursor: string | null;
};

export default function ActivityClient({ projectId }: { projectId: string }) {
  const router = useRouter();

  useRequireAuth();
  const { memberships, isProjectAccessError } = useMyMembership(projectId);

  useEffect(() => {
    if (isProjectAccessError) {
      router.replace('/403');
    }
    const err = memberships.error;
    if (err instanceof ApiError && err.statusCode >= 500) {
      router.replace('/5xx');
    }
  }, [isProjectAccessError, memberships.error, router]);

  const activity = useInfiniteQuery({
    queryKey: ['projects', projectId, 'activity'],
    enabled: !isProjectAccessError,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam ? `&cursor=${encodeURIComponent(pageParam)}` : '';
      const res = await apiFetch<ListActivityResponse>(`/projects/${projectId}/activity?limit=50${cursor}`, {
        method: 'GET',
      });
      if (!res.data) throw new Error('伺服器回應格式錯誤');
      return res.data;
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = activity.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold" data-testid="activity-heading">
          Activity
        </h1>
      </div>

      {activity.isLoading ? <p className="mt-3 text-slate-700">載入中…</p> : null}
      {activity.error ? (
        <p className="mt-3 text-sm text-red-600">
          {getUserFacingErrorMessage(activity.error, '載入失敗')}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2" data-testid="activity-list">
        {items.length === 0 && !activity.isLoading ? <li className="text-sm text-slate-600">尚無活動紀錄</li> : null}
        {items.map((a) => (
          <li key={a.id} className="rounded-md border border-slate-200 bg-white p-3">
            <div className="text-xs text-slate-500">{new Date(a.timestamp).toLocaleString()}</div>
            <div className="mt-1 text-sm text-slate-900">
              <span className="font-semibold">{a.action}</span>
              <span className="text-slate-500"> · {a.entityType}</span>
              <span className="text-slate-500"> · {a.entityId}</span>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 flex justify-center">
        <button
          type="button"
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
          disabled={!activity.hasNextPage || activity.isFetchingNextPage}
          onClick={() => activity.fetchNextPage()}
          data-testid="activity-load-more"
        >
          {activity.isFetchingNextPage ? '載入中…' : activity.hasNextPage ? '載入更多' : '沒有更多了'}
        </button>
      </div>
    </section>
  );
}
