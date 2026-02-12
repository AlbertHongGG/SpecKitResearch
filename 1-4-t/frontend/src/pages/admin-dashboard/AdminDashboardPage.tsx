import { useMemo, useState } from 'react'
import { useDashboardMetrics, type DashboardRange } from '../../api/admin'
import { isApiError } from '../../api/errors'
import { LoadingState } from '../../components/states/LoadingState'
import { ErrorState } from '../../components/states/ErrorState'
import { EmptyState } from '../../components/states/EmptyState'
import { DashboardCharts } from './DashboardCharts'
import { AgentLoadTable } from './AgentLoadTable'
import { UserManagementPanel } from './UserManagementPanel'

function msToText(ms: number | null) {
  if (ms === null) return '—'
  const sec = ms / 1000
  if (sec < 60) return `${Math.round(sec)} 秒`
  const min = sec / 60
  if (min < 60) return `${Math.round(min)} 分鐘`
  const hr = min / 60
  return `${hr.toFixed(1)} 小時`
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<DashboardRange>('last_7_days')
  const q = useDashboardMetrics({ range })

  const empty = useMemo(() => {
    const dist = q.data?.status_distribution
    if (!dist) return false
    const total = Object.values(dist).reduce((a, b) => a + b, 0)
    return total === 0
  }, [q.data?.status_distribution])

  const apiError = isApiError(q.error) ? q.error : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">服務品質與負載監控（依 range 統計）。</p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="text-slate-700">Range</span>
          <select
            className="rounded border bg-white px-2 py-1"
            value={range}
            onChange={(e) => setRange(e.target.value as DashboardRange)}
          >
            <option value="last_7_days">Last 7 days</option>
            <option value="last_30_days">Last 30 days</option>
          </select>
        </label>
      </div>

      {q.isLoading ? <LoadingState label="載入中…" /> : null}
      {q.isError ? (
        <ErrorState
          title="載入 dashboard 失敗"
          description={apiError ? `${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}` : undefined}
        />
      ) : null}

      {q.data && empty ? (
        <EmptyState title="目前沒有資料" description="此範圍內沒有任何工單。" />
      ) : null}

      {q.data && !empty ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded border bg-white p-4">
              <div className="text-xs text-slate-600">First response avg</div>
              <div className="mt-1 text-2xl font-semibold">{msToText(q.data.sla.first_response_time_ms_avg)}</div>
            </div>
            <div className="rounded border bg-white p-4">
              <div className="text-xs text-slate-600">Resolution avg</div>
              <div className="mt-1 text-2xl font-semibold">{msToText(q.data.sla.resolution_time_ms_avg)}</div>
            </div>
          </div>

          <DashboardCharts data={q.data} />

          <div className="grid gap-4 lg:grid-cols-2">
            <AgentLoadTable agentLoad={q.data.agent_load} />
            <UserManagementPanel />
          </div>
        </>
      ) : null}
    </div>
  )
}
