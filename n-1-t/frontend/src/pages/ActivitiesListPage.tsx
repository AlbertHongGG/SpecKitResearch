import { Link } from 'react-router-dom';

import { isApiError } from '../api/http';
import { EmptyState } from '../components/states/EmptyState';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { usePublicActivitiesList } from '../hooks/queries/usePublicActivities';

export function ActivitiesListPage() {
  const query = usePublicActivitiesList();

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError) {
    const message = isApiError(query.error) ? query.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => query.refetch()} />;
  }

  const items = query.data?.items ?? [];
  if (items.length === 0) {
    return <EmptyState message="目前沒有公開活動" />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">活動列表</h1>
      <ul className="space-y-3">
        {items.map((a) => (
          <li key={a.id} className="rounded border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div>
                <Link to={`/activities/${a.id}`} className="font-medium underline">
                  {a.title}
                </Link>
                <div className="mt-1 text-sm text-slate-600">{a.location}</div>
                <div className="text-sm text-slate-600">{a.date}</div>
              </div>
              <div className="text-sm text-slate-700 sm:text-right">
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
