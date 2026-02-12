import { useParams } from 'react-router-dom'
import { ErrorState } from '../../components/states/ErrorState'
import { LoadingState } from '../../components/states/LoadingState'
import { useAuth } from '../../app/auth'
import { CustomerReplyForm } from '../../features/tickets/components/CustomerReplyForm'
import { CloseTicketButton } from '../../features/tickets/components/CloseTicketButton'
import { AdminAssignmentControl } from '../../features/tickets/components/AdminAssignmentControl'
import { useTicketDetailQuery } from '../../features/tickets/api/tickets.queries'

export function CustomerTicketDetailPage() {
  const params = useParams()
  const ticketId = params.id ?? ''
  const { state } = useAuth()

  const query = useTicketDetailQuery({
    ticketId,
    enabled: ticketId.length > 0,
  })

  if (!ticketId) return <ErrorState error="Missing ticket id" />

  if (query.isLoading) return <LoadingState />
  if (query.isError) return <ErrorState error={query.error} />

  const data = query.data
  if (!data) return <LoadingState />

  const { ticket, timeline } = data

  const role = state.user?.role
  const isCustomer = role === 'Customer'
  const isAdmin = role === 'Admin'

  const canReply = isCustomer && ticket.status === 'Waiting for Customer'
  const canClose = isCustomer && ticket.status === 'Resolved'

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{ticket.title}</h1>
          <div className="mt-1 text-sm text-gray-600">{ticket.category}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs">
            {ticket.status}
          </span>
          {isCustomer ? (
            <CloseTicketButton ticketId={ticketId} disabled={!canClose} />
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-sm font-semibold">時間軸</h2>
        <ul className="mt-2 space-y-2">
          {timeline.map((item, idx) => (
            <li key={idx} className="rounded border bg-white p-3">
              {item.type === 'message' ? (
                <div>
                  <div className="text-xs text-gray-500">
                    {item.message.role} ·{' '}
                    {new Date(item.message.created_at).toLocaleString()}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm">
                    {item.message.content}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-600">
                  {item.action} · {new Date(item.created_at).toLocaleString()}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isAdmin ? (
        <div className="mt-6">
          <AdminAssignmentControl
            ticketId={ticketId}
            status={ticket.status}
            assigneeId={ticket.assignee_id}
          />
        </div>
      ) : null}

      {isCustomer ? (
        <div className="mt-6 rounded border bg-white p-4">
          <h2 className="text-sm font-semibold">回覆</h2>
          <div className="mt-2">
            <CustomerReplyForm ticketId={ticketId} disabled={!canReply} />
            {!canReply ? (
              <div className="mt-2 text-xs text-gray-500">
                只有在 Waiting for Customer 狀態可回覆。
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
