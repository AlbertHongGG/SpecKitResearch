import { useState } from 'react'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { EmptyState } from '../../components/states/EmptyState'
import {
  type DashboardRange,
  useAdminDashboardQuery,
} from '../../features/admin/api/admin.queries'
import { DashboardCharts } from '../../features/admin/components/DashboardCharts'

function StatCard(props: {
  title: string
  avg: number | null
  p50: number | null
  p90: number | null
}) {
  const fmt = (n: number | null) => (n === null ? '—' : `${Math.round(n)}s`)

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-semibold">{props.title}</div>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        <div>
          <div className="text-xs text-gray-500">Avg</div>
          <div className="font-medium">{fmt(props.avg)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">P50</div>
          <div className="font-medium">{fmt(props.p50)}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">P90</div>
          <div className="font-medium">{fmt(props.p90)}</div>
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<DashboardRange>('last_7_days')

  const query = useAdminDashboardQuery({ range })

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} />

  const data = query.data
  if (!data) return <LoadingState />

  const isEmpty =
    data.status_distribution.length === 0 &&
    data.agent_load.length === 0 &&
    data.sla.first_response_time.avg_seconds === null &&
    data.sla.resolution_time.avg_seconds === null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold">Admin Dashboard</h1>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Range</span>
          <div className="inline-flex overflow-hidden rounded border bg-white">
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${range === 'last_7_days' ? 'bg-gray-900 text-white' : ''}`}
              onClick={() => setRange('last_7_days')}
            >
              7 天
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-sm ${range === 'last_30_days' ? 'bg-gray-900 text-white' : ''}`}
              onClick={() => setRange('last_30_days')}
            >
              30 天
            </button>
          </div>
        </div>
      </div>

      {isEmpty ? (
        <EmptyState
          title="尚無資料"
          description="目前區間內沒有可顯示的指標。"
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <StatCard
              title="首次回覆時間 (FRT)"
              avg={data.sla.first_response_time.avg_seconds}
              p50={data.sla.first_response_time.p50_seconds}
              p90={data.sla.first_response_time.p90_seconds}
            />
            <StatCard
              title="解決時間 (RT)"
              avg={data.sla.resolution_time.avg_seconds}
              p50={data.sla.resolution_time.p50_seconds}
              p90={data.sla.resolution_time.p90_seconds}
            />
          </div>

          <DashboardCharts data={data} />
        </>
      )}
    </div>
  )
}
