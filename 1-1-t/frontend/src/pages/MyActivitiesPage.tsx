import { Link } from 'react-router-dom';
import { useMyActivities } from '../api/hooks/useMyActivities';
import { ErrorState } from '../components/feedback/ErrorState';
import { Loading } from '../components/feedback/Loading';
import { StatusBadge } from '../components/activity/StatusBadge';

export function MyActivitiesPage() {
  const q = useMyActivities();

  if (q.isLoading) return <Loading label="載入我的活動中…" />;
  if (q.isError) {
    return (
      <ErrorState
        error={q.error}
        title="無法載入"
        message={(q.error as any)?.message ?? '請先登入後再查看'}
        action={<Link className="text-indigo-600 underline" to="/login">前往登入</Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-gray-900">我的活動</h1>
      <div className="mt-4 grid gap-3">
        {q.data?.items.map((item) => (
          <div key={item.activity.id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-2">
              <Link className="font-semibold text-gray-900 hover:underline" to={`/activities/${item.activity.id}`}>
                {item.activity.title}
              </Link>
              <div className="flex gap-2">
                <StatusBadge kind="activity" status={item.activity.status} />
                <span className="text-xs text-gray-500">{item.userStatus === 'ended' ? '已結束' : '即將到來'}</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              活動時間：{new Date(item.activity.date).toLocaleString()}｜地點：{item.activity.location}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
