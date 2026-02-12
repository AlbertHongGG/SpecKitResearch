import { Link } from 'react-router-dom';
import { useAdminActivities } from '../../api/hooks/useAdminActivities';
import { ActivityTable } from '../../components/admin/ActivityTable';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Loading } from '../../components/feedback/Loading';

export function AdminPanelPage() {
  const { list, transition } = useAdminActivities();

  if (list.isLoading) return <Loading label="載入後台活動中…" />;
  if (list.isError) return <ErrorState error={list.error} title="載入失敗" />;

  const items = list.data?.items ?? [];
  const busy = transition.isPending;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">後台：活動管理</h1>
          <p className="mt-1 text-sm text-gray-600">建立、編輯與狀態轉移（發布/關閉/下架）。</p>
        </div>

        <Link
          to="/admin/activities/new"
          className="w-full rounded-md bg-indigo-600 px-3 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700 sm:w-auto"
        >
          + 建立活動
        </Link>
      </div>

      <div className="mt-4">
        <ActivityTable
          items={items}
          busy={busy}
          onTransition={(activityId, action) => transition.mutate({ id: activityId, action })}
        />
      </div>
    </div>
  );
}
