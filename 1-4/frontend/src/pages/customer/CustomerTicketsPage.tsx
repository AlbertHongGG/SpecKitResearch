import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { useCustomerTicketsQuery } from '../../features/tickets/api/tickets.queries'

export function CustomerTicketsPage() {
  const query = useCustomerTicketsQuery({})

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} />
  if (!query.data) return <LoadingState />

  const tickets = query.data.tickets

  if (tickets.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">我的工單</h1>
          <Link className="rounded border px-3 py-1 text-sm" to="/tickets/new">
            建立工單
          </Link>
        </div>
        <EmptyState title="尚無工單" description="點右上角建立第一筆工單。" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">我的工單</h1>
        <Link className="rounded border px-3 py-1 text-sm" to="/tickets/new">
          建立工單
        </Link>
      </div>

      <ul className="mt-4 space-y-2">
        {tickets.map((t) => (
          <li key={t.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between gap-3">
              <Link to={`/tickets/${t.id}`} className="font-medium">
                {t.title}
              </Link>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
                {t.status}
              </span>
            </div>
            <div className="mt-1 text-xs text-gray-600">{t.category}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
