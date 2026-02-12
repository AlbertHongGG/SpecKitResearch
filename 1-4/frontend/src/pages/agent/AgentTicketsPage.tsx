import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/states/EmptyState'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import type { ApiTicketStatus } from '../../features/tickets/api/tickets.queries'
import { useAgentTicketsQuery } from '../../features/agent/api/agent.queries'
import { AgentTicketActions } from '../../features/tickets/components/AgentTicketActions'
import { InternalNoteForm } from '../../features/tickets/components/InternalNoteForm'

const statusOptions: Array<{ label: string; value: ApiTicketStatus | '' }> = [
  { label: '全部狀態', value: '' },
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Waiting for Customer', value: 'Waiting for Customer' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' },
]

export function AgentTicketsPage() {
  const [view, setView] = useState<'unassigned' | 'mine'>('unassigned')
  const [status, setStatus] = useState<ApiTicketStatus | undefined>(undefined)

  const query = useAgentTicketsQuery({ view, status })

  const headerTitle = view === 'unassigned' ? '未指派工單' : '我的工單'

  const tickets = useMemo(() => query.data?.tickets ?? [], [query.data])

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">客服工作台</h1>
          <div className="mt-1 text-sm text-gray-600">{headerTitle}</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={
              view === 'unassigned'
                ? 'rounded bg-black px-3 py-1.5 text-sm text-white'
                : 'rounded border px-3 py-1.5 text-sm'
            }
            onClick={() => setView('unassigned')}
          >
            未指派
          </button>
          <button
            type="button"
            className={
              view === 'mine'
                ? 'rounded bg-black px-3 py-1.5 text-sm text-white'
                : 'rounded border px-3 py-1.5 text-sm'
            }
            onClick={() => setView('mine')}
          >
            我的
          </button>

          <select
            className="rounded border px-2 py-1.5 text-sm"
            value={status ?? ''}
            onChange={(e) => {
              const v = e.target.value as ApiTicketStatus | ''
              setStatus(v === '' ? undefined : v)
            }}
          >
            {statusOptions.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState error={query.error} /> : null}

        {!query.isLoading && !query.isError && tickets.length === 0 ? (
          <EmptyState title="尚無工單" description="此篩選條件下沒有工單。" />
        ) : null}

        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="rounded border bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">
                    <Link className="underline" to={`/tickets/${t.id}`}>
                      {t.title}
                    </Link>
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    <span className="mr-2">狀態：{t.status}</span>
                    <span className="mr-2">分類：{t.category}</span>
                  </div>
                </div>

                <AgentTicketActions ticket={t} view={view} />
              </div>

              {view === 'mine' && t.status !== 'Closed' ? (
                <div className="mt-3 border-t pt-3">
                  <InternalNoteForm ticketId={t.id} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
