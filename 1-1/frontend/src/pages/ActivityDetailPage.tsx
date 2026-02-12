import { useParams } from 'react-router-dom'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Spinner } from '../components/ui/Spinner'
import { useAuth } from '../features/auth/useAuth'
import { useActivityDetail } from '../features/activities/queries'
import { useRegisterMutation } from '../features/registrations/mutations'
import { getErrorMessage } from '../lib/errorMessages'
import { toastError, toastSuccess } from '../lib/notifications'

export function ActivityDetailPage() {
  const { activityId } = useParams()
  const auth = useAuth()

  if (!activityId) {
    return <div className="p-6">缺少 activityId</div>
  }

  const query = useActivityDetail(activityId)
  const registerMutation = useRegisterMutation()

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
        <Alert title="載入失敗" description="無法取得活動資訊，請稍後再試。" />
      </div>
    )
  }

  const a = query.data?.activity
  if (!a) {
    return (
      <div className="p-6">
        <Alert title="找不到活動" description="此活動不存在或已下架。" />
      </div>
    )
  }

  const dateText = new Date(a.date).toLocaleString()
  const deadlineText = new Date(a.deadline).toLocaleString()

  const canRegister = !!auth.user && a.viewer.can_register

  return (
    <div className="p-6">
      <div className="rounded-lg border bg-white p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{a.title}</h1>
            <div className="mt-1 text-sm text-gray-600">{dateText} ・ {a.location}</div>
            <div className="mt-2 text-sm text-gray-700">剩餘名額：{a.remaining_slots} / {a.capacity}</div>
            <div className="mt-1 text-xs text-gray-500">報名截止：{deadlineText}</div>
          </div>

          <div className="flex flex-col gap-2 md:items-end">
            {a.viewer.is_registered ? (
              <div className="text-sm font-medium text-emerald-700">你已報名</div>
            ) : null}

            {!auth.user ? (
              <Alert title="需要登入" description="登入後才能報名活動。" />
            ) : null}

            <Button
              disabled={!canRegister || registerMutation.isPending}
              onClick={() =>
                registerMutation.mutate(
                  { activityId },
                  {
                    onSuccess: () => toastSuccess('報名成功'),
                    onError: (err) => toastError('報名失敗', getErrorMessage(err)),
                  },
                )
              }
            >
              {registerMutation.isPending ? '報名中…' : '報名'}
            </Button>

            {registerMutation.isError ? (
              <div className="text-sm text-red-700">{getErrorMessage(registerMutation.error)}</div>
            ) : null}

            {registerMutation.isSuccess ? <div className="text-sm text-emerald-700">報名成功</div> : null}
          </div>
        </div>

        <hr className="my-6" />

        <div className="prose max-w-none">
          <h2 className="text-base font-semibold">活動說明</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-gray-800">{a.description}</p>
        </div>
      </div>
    </div>
  )
}
