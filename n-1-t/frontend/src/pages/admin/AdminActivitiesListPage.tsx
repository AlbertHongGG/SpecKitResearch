import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { isApiError } from '../../api/http';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import {
  useAdminActivitiesList,
  useChangeAdminActivityStatus,
} from '../../hooks/admin/useAdminActivities';

const ALL = 'ALL' as const;

export function AdminActivitiesListPage() {
  const query = useAdminActivitiesList();
  const statusMutation = useChangeAdminActivityStatus();
  const [filter, setFilter] = useState<string>(ALL);

  const items = query.data?.items;
  const filtered = useMemo(() => {
    const list = items ?? [];
    if (filter === ALL) return list;
    return list.filter((a) => a.status === filter);
  }, [filter, items]);

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError) {
    const message = isApiError(query.error) ? query.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => query.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">後台：活動管理</h1>
          <div className="text-sm text-slate-600">可查看所有狀態活動並進行管理操作。</div>
        </div>
        <div className="flex items-center gap-2">
          <Link className="rounded border px-3 py-1 text-sm" to="/activities">
            回公開列表
          </Link>
          <Link className="rounded border bg-slate-900 px-3 py-1 text-sm text-white" to="/admin/activities/new">
            建立活動
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm text-slate-700" htmlFor="admin-status-filter">
          篩選狀態
        </label>
        <select
          id="admin-status-filter"
          className="rounded border px-2 py-1 text-sm"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value={ALL}>全部</option>
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="FULL">FULL</option>
          <option value="CLOSED">CLOSED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      {filtered.length === 0 ? <EmptyState message="目前沒有符合條件的活動" /> : null}

      <ul className="space-y-3">
        {filtered.map((a) => {
          const canPublish = a.status === 'DRAFT';
          const canClose = a.status === 'PUBLISHED' || a.status === 'FULL';
          const canArchive = a.status === 'DRAFT' || a.status === 'CLOSED';

          return (
            <li key={a.id} className="rounded border bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="font-medium">{a.title}</div>
                  <div className="text-sm text-slate-700">地點：{a.location}</div>
                  <div className="text-sm text-slate-700">活動時間：{a.date}</div>
                  <div className="text-sm text-slate-700">截止時間：{a.deadline}</div>
                </div>

                <div className="text-right text-sm text-slate-700">
                  <div>{a.status}</div>
                  <div>
                    {a.registeredCount}/{a.capacity}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link className="rounded border px-3 py-1 text-sm" to={`/admin/activities/${a.id}/edit`}>
                  編輯
                </Link>
                <Link
                  className="rounded border px-3 py-1 text-sm"
                  to={`/admin/activities/${a.id}/registrations`}
                >
                  名單
                </Link>

                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={!canPublish || statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ activityId: a.id, toStatus: 'PUBLISHED' })}
                >
                  發佈
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={!canClose || statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ activityId: a.id, toStatus: 'CLOSED' })}
                >
                  關閉
                </button>
                <button
                  type="button"
                  className="rounded border px-3 py-1 text-sm disabled:opacity-50"
                  disabled={!canArchive || statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ activityId: a.id, toStatus: 'ARCHIVED' })}
                >
                  下架
                </button>

                {statusMutation.isError ? (
                  <div className="text-sm text-red-700">
                    {isApiError(statusMutation.error) ? statusMutation.error.message : '操作失敗'}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
