import { ActivityCard } from '../components/activity/ActivityCard';
import { ErrorState } from '../components/feedback/ErrorState';
import { Loading } from '../components/feedback/Loading';
import { useActivities } from '../api/hooks/useActivities';

export function ActivityListPage() {
  const q = useActivities();

  if (q.isLoading) return <Loading label="載入活動中…" />;
  if (q.isError)
    return <ErrorState error={q.error} title="載入失敗" message={(q.error as any)?.message} />;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900">活動列表</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {q.data?.items.map((item) => (
          <ActivityCard key={item.activity.id} item={item} />
        ))}
      </div>
    </div>
  );
}
