import type { DashboardResponse } from '../../api/admin'

function shortId(id: string) {
  return id.length > 10 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}

export function AgentLoadTable(props: { agentLoad: DashboardResponse['agent_load'] }) {
  const sorted = [...props.agentLoad].sort((a, b) => b.in_progress_count - a.in_progress_count)

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium text-slate-700">Agent load（In Progress）</div>
      {sorted.length === 0 ? (
        <div className="mt-2 text-sm text-slate-600">目前沒有 In Progress 的指派工單。</div>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs text-slate-600">
              <tr>
                <th className="py-2 pr-4">Agent</th>
                <th className="py-2">In Progress</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map((r) => (
                <tr key={r.agent_id}>
                  <td className="py-2 pr-4 font-mono text-xs text-slate-700" title={r.agent_id}>
                    {shortId(r.agent_id)}
                  </td>
                  <td className="py-2">{r.in_progress_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
