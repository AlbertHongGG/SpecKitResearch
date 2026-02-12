import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardResponse } from '../../api/admin'

function msToLabel(ms: number | null) {
  if (ms === null) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  const sec = ms / 1000
  if (sec < 60) return `${Math.round(sec)} s`
  const min = sec / 60
  if (min < 60) return `${Math.round(min)} min`
  const hr = min / 60
  return `${hr.toFixed(1)} hr`
}

export function DashboardCharts(props: { data: DashboardResponse }) {
  const slaData = [
    { name: 'First response', value: props.data.sla.first_response_time_ms_avg ?? 0, label: msToLabel(props.data.sla.first_response_time_ms_avg) },
    { name: 'Resolution', value: props.data.sla.resolution_time_ms_avg ?? 0, label: msToLabel(props.data.sla.resolution_time_ms_avg) },
  ]

  const statusData = Object.entries(props.data.status_distribution)
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => a.status.localeCompare(b.status))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium text-slate-700">SLA（平均）</div>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={slaData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: any, _n: any, p: any) => (p?.payload?.label ? p.payload.label : v)} />
              <Bar dataKey="value" fill="#0f172a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-medium text-slate-700">Status distribution</div>
        <div className="mt-3 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={statusData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#334155" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
