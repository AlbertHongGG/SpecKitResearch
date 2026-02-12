import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useMyActivities } from '../features/me/queries'
import { useCancelMutation } from '../features/registrations/mutations'
import { getErrorMessage } from '../lib/errorMessages'
import { toastError, toastSuccess } from '../lib/notifications'

function formatStatusText(value: 'active' | 'canceled') {
  return value === 'active' ? '已報名' : '已取消'
}

function formatTimeStatusText(value: 'upcoming' | 'ended') {
  return value === 'upcoming' ? '即將開始' : '已結束'
}

export function MyActivitiesPage() {
  const query = useMyActivities()
  const cancelMutation = useCancelMutation()

  if (query.isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2">
          <Spinner />
          <span className="text-sm text-gray-600">載入我的活動中…</span>
        </div>
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <Alert title="載入失敗" description="無法取得我的活動，請稍後再試。" />
      </div>
    )
  }

  const items = (query.data?.items ?? [])
    .slice()
    .sort((a, b) => new Date(a.activity.date).getTime() - new Date(b.activity.date).getTime())

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">我的活動</h1>

      {items.length === 0 ? (
        <div className="mt-4 text-sm text-gray-600">目前沒有任何活動。</div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {items.map((item) => {
            const a = item.activity
            const canCancel = item.registration_status === 'active' && item.activity_time_status === 'upcoming'
            const isPending = cancelMutation.isPending && cancelMutation.variables?.activityId === a.id

            return (
              <div key={a.id} className="rounded-lg border bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{a.title}</h2>
                    <div className="mt-1 text-sm text-gray-600">
                      {new Date(a.date).toLocaleString()} ・ {a.location}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                        {formatStatusText(item.registration_status)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                        {formatTimeStatusText(item.activity_time_status)}
                      </span>
                      <span className="rounded bg-gray-100 px-2 py-1 text-gray-700">
                        狀態：{a.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 md:items-end">
                    <Button
                      variant="secondary"
                      disabled={!canCancel || isPending}
                      onClick={() =>
                        cancelMutation.mutate(
                          { activityId: a.id },
                          {
                            onSuccess: () => toastSuccess('已取消報名'),
                            onError: (err) => toastError('取消失敗', getErrorMessage(err)),
                          },
                        )
                      }
                    >
                      {isPending ? '取消中…' : '取消報名'}
                    </Button>

                    {cancelMutation.isError && cancelMutation.variables?.activityId === a.id ? (
                      <div className="text-sm text-red-700">{getErrorMessage(cancelMutation.error)}</div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
