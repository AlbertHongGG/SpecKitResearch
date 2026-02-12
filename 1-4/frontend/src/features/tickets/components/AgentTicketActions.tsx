import { useMemo } from 'react'
import type { ApiTicket, ApiTicketStatus } from '../api/tickets.queries'
import {
  useAgentChangeTicketStatusMutation,
  useTakeTicketMutation,
} from '../../agent/api/agent.queries'
import { ErrorState } from '../../../components/states/ErrorState'

export function AgentTicketActions(props: {
  ticket: ApiTicket
  view: 'unassigned' | 'mine'
}) {
  const take = useTakeTicketMutation({ ticketId: props.ticket.id })
  const changeStatus = useAgentChangeTicketStatusMutation({
    ticketId: props.ticket.id,
  })

  const actions = useMemo(() => {
    if (props.view === 'unassigned') {
      return (
        <button
          type="button"
          disabled={take.isPending}
          className="rounded bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
          onClick={() => take.mutate()}
        >
          接手
        </button>
      )
    }

    const from = props.ticket.status

    const buttons: Array<{
      label: string
      to: ApiTicketStatus
    }> = []

    if (from === 'In Progress') {
      buttons.push({ label: '要求客戶補充', to: 'Waiting for Customer' })
      buttons.push({ label: '標記已解決', to: 'Resolved' })
    }

    if (from === 'Resolved') {
      buttons.push({ label: '重新開啟', to: 'In Progress' })
    }

    return (
      <div className="flex flex-wrap gap-2">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            disabled={changeStatus.isPending}
            className="rounded border px-3 py-1.5 text-sm disabled:opacity-50"
            onClick={() => {
              changeStatus.mutate({ from_status: from, to_status: b.to })
            }}
          >
            {b.label}
          </button>
        ))}
      </div>
    )
  }, [props.view, props.ticket.status, take, changeStatus])

  const error = take.error ?? changeStatus.error

  return (
    <div className="space-y-2">
      {error ? (
        <div className="rounded border bg-white">
          <ErrorState error={error} title="操作失敗" />
        </div>
      ) : null}
      {actions}
    </div>
  )
}
