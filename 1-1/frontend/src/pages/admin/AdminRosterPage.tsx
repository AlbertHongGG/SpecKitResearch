import { useParams } from 'react-router-dom'
import { Alert } from '../../components/ui/Alert'
import { Button } from '../../components/ui/Button'
import { Spinner } from '../../components/ui/Spinner'
import { downloadRosterCsv, useAdminRoster } from '../../features/admin/api'
import { toastError, toastSuccess } from '../../lib/notifications'

export function AdminRosterPage() {
  const { activityId } = useParams()

  if (!activityId) {
    return <div className="p-6">缺少 activityId</div>
  }

  const query = useAdminRoster(activityId)

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
        <Alert title="載入失敗" description="無法取得名單。" />
      </div>
    )
  }

  const items = query.data?.items ?? []

  async function onDownload() {
    try {
      const csvText = await downloadRosterCsv(activityId)
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `roster-${activityId}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toastSuccess('已下載 CSV')
    } catch (err) {
      toastError('下載失敗', (err as any)?.message ?? '請稍後再試')
      throw err
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">活動名單</h1>
        <Button variant="secondary" onClick={() => void onDownload()}>
          下載 CSV
        </Button>
      </div>

      <div className="mt-4 overflow-auto rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs text-gray-700">
            <tr>
              <th className="px-4 py-2">姓名</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">報名時間</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={`${i.email}-${i.registered_at}`} className="border-t">
                <td className="px-4 py-2">{i.name}</td>
                <td className="px-4 py-2">{i.email}</td>
                <td className="px-4 py-2">{new Date(i.registered_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
