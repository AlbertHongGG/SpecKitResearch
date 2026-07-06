import { Link } from 'react-router-dom';

import { isApiError } from '../api/http';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { useMyActivities } from '../hooks/queries/useMyActivities';

export function MyActivitiesPage() {
  const query = useMyActivities();

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError) {
    const message = isApiError(query.error) ? query.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => query.refetch()} />;
  }

  const items = query.data?.items ?? [];

  if (!items.length) {
    return <EmptyState message="尚無報名中的活動" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">我的活動</h1>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded border bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Link to={`/activities/${a.id}`} className="font-medium underline">
                  {a.title}
                </Link>
                <div className="text-sm text-slate-700">地點：{a.location}</div>
                <div className="text-sm text-slate-700">活動時間：{a.date}</div>
              </div>
              <div className="text-sm text-slate-700">
                <div>{a.status}</div>
                <div>
                  {a.registeredCount}/{a.capacity}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
