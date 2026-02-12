import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DashboardResponse } from '../api/admin.queries'

const PIE_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export function DashboardCharts(props: { data: DashboardResponse }) {
  const statusData = props.data.status_distribution
  const agentData = props.data.agent_load

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded border bg-white p-4">
        <div className="text-sm font-semibold">狀態分佈</div>
        {statusData.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600">尚無資料</div>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="status"
                  outerRadius={90}
                  label
                >
                  {statusData.map((_entry, idx) => (
                    <Cell
                      key={idx}
                      fill={PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded border bg-white p-4">
        <div className="text-sm font-semibold">客服負載（In Progress）</div>
        {agentData.length === 0 ? (
          <div className="mt-3 text-sm text-gray-600">尚無資料</div>
        ) : (
          <div className="mt-3 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent_id" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey="in_progress_count"
                  fill="#4f46e5"
                  name="In Progress"
                />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-gray-500">
              X 軸隱藏：以 agent_id 顯示會過長（但 tooltip 仍可檢視）。
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
