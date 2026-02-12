import type { TicketMessage } from '../../api/tickets'

export function MessageTimeline(props: { messages: TicketMessage[]; showInternal: boolean }) {
  const sorted = [...props.messages].sort((a, b) => a.created_at.localeCompare(b.created_at))

  const visible = props.showInternal ? sorted : sorted.filter((m) => !m.is_internal)

  return (
    <div className="space-y-3">
      {visible.map((m) => (
        <div key={m.id} className="rounded border bg-white p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium text-slate-900">
              {m.author.email} <span className="text-xs text-slate-500">({m.role})</span>
              {m.is_internal ? (
                <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">internal</span>
              ) : null}
            </div>
            <div className="text-xs text-slate-500">{new Date(m.created_at).toLocaleString()}</div>
          </div>
          <div className="mt-2 whitespace-pre-wrap break-words text-sm text-slate-800">{m.content}</div>
        </div>
      ))}
    </div>
  )
}
