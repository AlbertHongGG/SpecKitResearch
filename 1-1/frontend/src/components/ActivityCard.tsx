import { Link } from 'react-router-dom'
import type { ActivitySummary } from '../api/types'

function statusLabel(status: ActivitySummary['status']) {
  switch (status) {
    case 'published':
      return '可報名'
    case 'full':
      return '額滿'
    case 'closed':
      return '已關閉'
    case 'archived':
      return '已下架'
    case 'draft':
      return '草稿'
    default:
      return status
  }
}

export function ActivityCard(props: { activity: ActivitySummary }) {
  const a = props.activity
  const dateText = new Date(a.date).toLocaleString()

  return (
    <Link
      to={`/activities/${encodeURIComponent(a.id)}`}
      className="block rounded-lg border bg-white p-4 shadow-sm transition hover:shadow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-base font-semibold text-gray-900">{a.title}</div>
          <div className="mt-1 text-sm text-gray-600">{dateText} ・ {a.location}</div>
        </div>
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
          {statusLabel(a.status)}
        </span>
      </div>

      <div className="mt-3 text-sm text-gray-700">
        剩餘名額：<span className="font-medium">{a.remaining_slots}</span> / {a.capacity}
      </div>

      {a.viewer?.is_registered ? (
        <div className="mt-2 text-xs text-emerald-700">你已報名</div>
      ) : null}
    </Link>
  )
}
