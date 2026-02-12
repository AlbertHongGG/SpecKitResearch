import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMyTickets, type TicketStatus } from '../../api/tickets'
import { LoadingState } from '../../components/states/LoadingState'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { CreateTicketDialog } from './CreateTicketDialog'

const STATUSES: Array<{ label: string; value: TicketStatus | 'ALL' }> = [
  { label: '全部', value: 'ALL' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Waiting for Customer', value: 'Waiting for Customer' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

export function TicketsPage() {
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL')
  const [openCreate, setOpenCreate] = useState(false)
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [status, pageSize])

  const offset = page * pageSize

  const queryParams = useMemo(
    () => ({ status: status === 'ALL' ? undefined : status, limit: pageSize, offset }),
    [status, pageSize, offset],
  )
  const ticketsQuery = useMyTickets(queryParams)

  const total = ticketsQuery.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 0
  const canNext = page + 1 < totalPages

  useEffect(() => {
    if (!ticketsQuery.data) return
    if (page >= totalPages) setPage(totalPages - 1)
  }, [ticketsQuery.data, page, totalPages])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">我的工單</h1>
          <p className="text-sm text-slate-600">查看與追蹤你的票單。</p>
        </div>
        <button
          type="button"
          className="w-full rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 sm:w-auto"
          onClick={() => setOpenCreate(true)}
        >
          建立工單
        </button>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="customer-tickets-status" className="text-sm text-slate-700">
          狀態
        </label>
        <select
          id="customer-tickets-status"
          className="rounded border bg-white px-2 py-1 text-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value as TicketStatus | 'ALL')}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <label htmlFor="customer-tickets-page-size" className="text-sm text-slate-700">
            每頁
          </label>
          <select
            id="customer-tickets-page-size"
            className="rounded border bg-white px-2 py-1 text-sm"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {ticketsQuery.isLoading ? <LoadingState label="載入中…" /> : null}
      {ticketsQuery.isError ? <ErrorState /> : null}

      {ticketsQuery.data && ticketsQuery.data.items.length === 0 ? <EmptyState title="目前沒有工單" /> : null}

      {ticketsQuery.data && ticketsQuery.data.items.length > 0 ? (
        <div className="overflow-hidden rounded border bg-white">
          <ul className="divide-y">
            {ticketsQuery.data.items.map((t) => (
              <li key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <Link to={`/tickets/${t.id}`} className="font-medium text-slate-900 hover:underline">
                      {t.title}
                    </Link>
                    <div className="mt-1 text-xs text-slate-600">
                      {t.category} · {t.status}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{new Date(t.updated_at).toLocaleString()}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {ticketsQuery.data && ticketsQuery.data.total > 0 ? (
        <nav className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" aria-label="Pagination">
          <div className="text-sm text-slate-600">
            共 {total} 筆 · 顯示 {Math.min(offset + 1, total)}–{Math.min(offset + pageSize, total)}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border bg-white px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
              disabled={!canPrev}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              上一頁
            </button>
            <div className="text-sm text-slate-700">
              第 {page + 1} / {totalPages} 頁
            </div>
            <button
              type="button"
              className="rounded border bg-white px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
              disabled={!canNext}
              onClick={() => setPage((p) => p + 1)}
            >
              下一頁
            </button>
          </div>
        </nav>
      ) : null}

      <CreateTicketDialog open={openCreate} onClose={() => setOpenCreate(false)} />
    </div>
  )
}
