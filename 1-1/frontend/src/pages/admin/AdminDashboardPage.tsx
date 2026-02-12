import { Link } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { useAdminActivities, useChangeActivityStatus } from '../../features/admin/api'
import type { ActivityStatus } from '../../api/types'
import { getErrorMessage } from '../../lib/errorMessages'
import { toastError, toastSuccess } from '../../lib/notifications'

function statusLabel(status: ActivityStatus) {
  switch (status) {
    case 'draft':
      return '草稿'
    case 'published':
      return '已發布'
    case 'full':
      return '額滿'
    case 'closed':
      return '已關閉'
    case 'archived':
      return '已下架'
  }
}

export function AdminDashboardPage() {
  const query = useAdminActivities()
  const changeStatus = useChangeActivityStatus()

  function confirmChange(next: ActivityStatus) {
    if (next === 'published') return window.confirm('確定要發布此活動嗎？')
    if (next === 'closed') return window.confirm('確定要關閉此活動嗎？')
    if (next === 'archived') return window.confirm('確定要下架此活動嗎？')
    return true
  }

  if (query.isLoading) {
    return (
      <div className="p-6">
        <Spinner />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="p-6">
        <Alert title="載入失敗" description="無法取得活動列表。" />
      </div>
    )
  }

  const items = query.data?.items ?? []

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">管理後台</h1>
        <Link to="/admin/activities/new">
          <Button>建立活動</Button>
        </Link>
      </div>

      {changeStatus.isError ? (
        <div className="mt-4">
          <Alert title="操作失敗" description={getErrorMessage(changeStatus.error)} />
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-3">
        {items.map((a) => {
          const canPublish = a.status === 'draft'
          const canClose = a.status === 'published' || a.status === 'full'
          const canArchive = a.status === 'draft' || a.status === 'closed'

          return (
            <div key={a.id} className="rounded-lg border bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-base font-semibold text-gray-900">{a.title}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {new Date(a.date).toLocaleString()} ・ {a.location}
                  </div>
                  <div className="mt-2 text-xs text-gray-700">狀態：{statusLabel(a.status)}</div>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                  <Link to={`/admin/activities/${encodeURIComponent(a.id)}/edit`}>
                    <Button variant="secondary">編輯</Button>
                  </Link>
                  <Link to={`/admin/activities/${encodeURIComponent(a.id)}/roster`}>
                    <Button variant="secondary">名單</Button>
                  </Link>
                  <Button
                    variant="secondary"
                    disabled={!canPublish || changeStatus.isPending}
                    onClick={() => {
                      if (!confirmChange('published')) return
                      changeStatus.mutate(
                        { activityId: a.id, newStatus: 'published' },
                        {
                          onSuccess: () => toastSuccess('狀態已更新'),
                          onError: (err) => toastError('操作失敗', getErrorMessage(err)),
                        },
                      )
                    }}
                  >
                    發布
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canClose || changeStatus.isPending}
                    onClick={() => {
                      if (!confirmChange('closed')) return
                      changeStatus.mutate(
                        { activityId: a.id, newStatus: 'closed' },
                        {
                          onSuccess: () => toastSuccess('狀態已更新'),
                          onError: (err) => toastError('操作失敗', getErrorMessage(err)),
                        },
                      )
                    }}
                  >
                    關閉
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={!canArchive || changeStatus.isPending}
                    onClick={() => {
                      if (!confirmChange('archived')) return
                      changeStatus.mutate(
                        { activityId: a.id, newStatus: 'archived' },
                        {
                          onSuccess: () => toastSuccess('狀態已更新'),
                          onError: (err) => toastError('操作失敗', getErrorMessage(err)),
                        },
                      )
                    }}
                  >
                    下架
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
