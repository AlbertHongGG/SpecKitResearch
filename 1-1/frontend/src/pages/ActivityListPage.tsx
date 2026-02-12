import { ActivityCard } from '../components/ActivityCard'
import { Alert } from '../components/ui/Alert'
import { Spinner } from '../components/ui/Spinner'
import { useActivitiesList } from '../features/activities/queries'

export function ActivityListPage() {
  const query = useActivitiesList()

  if (query.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <span className="text-sm text-gray-600">載入活動中…</span>
        </div>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <Alert title="載入失敗" description="無法取得活動列表，請稍後再試。" />
      </div>
    )
  }

  const items = query.data?.items ?? []

  return (
    <div className="p-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">活動列表</h1>
          <p className="mt-1 text-sm text-gray-600">可公開瀏覽；登入後可報名。</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">目前沒有可報名的活動。</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((a) => (
            <ActivityCard key={a.id} activity={a} />
          ))}
        </div>
      )}
    </div>
  )
}
