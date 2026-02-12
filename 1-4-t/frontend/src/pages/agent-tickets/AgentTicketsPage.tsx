import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAgentTickets, type AgentTicketsView } from '../../api/agent'
import type { TicketStatus } from '../../api/tickets'
import { LoadingState } from '../../components/states/LoadingState'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'

const VIEWS: Array<{ label: string; value: AgentTicketsView }> = [
  { label: '未指派', value: 'unassigned' },
  { label: '我的工單', value: 'mine' },
]

const STATUSES: Array<{ label: string; value: TicketStatus | 'ALL' }> = [
  { label: '全部', value: 'ALL' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Waiting for Customer', value: 'Waiting for Customer' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

export function AgentTicketsPage() {
  const [view, setView] = useState<AgentTicketsView>('unassigned')
  const [status, setStatus] = useState<TicketStatus | 'ALL'>('ALL')
  const [pageSize, setPageSize] = useState(20)
  const [page, setPage] = useState(0)

  useEffect(() => {
    setPage(0)
  }, [view, status, pageSize])

  const offset = page * pageSize

  const params = useMemo(
    () => ({ view, status: status === 'ALL' ? undefined : status, limit: pageSize, offset }),
    [view, status, pageSize, offset],
  )

  const q = useAgentTickets(params)

  const total = q.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const canPrev = page > 0
  const canNext = page + 1 < totalPages

  useEffect(() => {
    if (!q.data) return
    if (page >= totalPages) setPage(totalPages - 1)
  }, [q.data, page, totalPages])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">工作台</h1>
        <p className="mt-1 text-sm text-slate-600">查看未指派與指派給你的工單。</p>
      </div>

      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex overflow-hidden rounded border bg-white" role="group" aria-label="工單視圖">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={view === v.value}
              className={`px-3 py-1.5 text-sm ${view === v.value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
              onClick={() => setView(v.value)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="agent-tickets-status" className="text-sm text-slate-700">
            狀態
          </label>
          <select
            id="agent-tickets-status"
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
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="agent-tickets-page-size" className="text-sm text-slate-700">
            每頁
          </label>
          <select
            id="agent-tickets-page-size"
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

      {q.isLoading ? <LoadingState label="載入中…" /> : null}
      {q.isError ? <ErrorState /> : null}

      {q.data && q.data.items.length === 0 ? <EmptyState title="沒有符合條件的工單" /> : null}

      {q.data && q.data.items.length > 0 ? (
        <div className="overflow-hidden rounded border bg-white">
          <ul className="divide-y">
            {q.data.items.map((t) => (
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

      {q.data && q.data.total > 0 ? (
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
    </div>
  )
}
