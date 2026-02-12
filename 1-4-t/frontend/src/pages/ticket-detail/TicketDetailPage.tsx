import { useParams } from 'react-router-dom'
import { useTicketDetail } from '../../api/tickets'
import { useAuth } from '../../app/auth/useAuth'
import { LoadingState } from '../../components/states/LoadingState'
import { NotFoundState } from '../../components/states/NotFoundState'
import { ForbiddenState } from '../../components/states/ForbiddenState'
import { ErrorState } from '../../components/states/ErrorState'
import { isApiError } from '../../api/errors'
import { MessageTimeline } from './MessageTimeline'
import { CustomerReplyBox } from './CustomerReplyBox'
import { CloseTicketButton } from './CloseTicketButton'
import { AgentActionsPanel } from './AgentActionsPanel'
import { AgentStatusControls } from './AgentStatusControls'
import { InternalNoteBox } from './InternalNoteBox'
import { AdminAssignmentPanel } from './AdminAssignmentPanel'

export function TicketWriteControls(props: {
  role: 'Customer' | 'Agent' | 'Admin'
  ticketId: string
  status: string
}) {
  if (props.status === 'Closed') return null

  if (props.role === 'Customer' && props.status === 'Waiting for Customer') {
    return <CustomerReplyBox ticketId={props.ticketId} />
  }

  if ((props.role === 'Customer' || props.role === 'Admin') && props.status === 'Resolved') {
    return <CloseTicketButton ticketId={props.ticketId} />
  }

  return null
}

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const auth = useAuth()

  const id = ticketId ?? ''
  const q = useTicketDetail(id)

  if (!id) return <NotFoundState />
  if (q.isLoading) return <LoadingState label="載入中…" />

  const err = isApiError(q.error) ? q.error : null
  if (err?.status === 404) return <NotFoundState />
  if (err?.status === 403) return <ForbiddenState />
  if (q.isError) return <ErrorState />

  const ticket = q.data?.ticket
  if (!ticket) return <ErrorState />

  const role = auth.user?.role
  if (!role) return <ForbiddenState />

  const showInternal = role !== 'Customer'

  const isClosed = ticket.status === 'Closed'
  const currentUserId = auth.user?.id ?? ''
  const assigneeId = ticket.assignee?.id ?? null

  return (
    <div className="space-y-4">
      <div className="rounded border bg-white p-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{ticket.title}</h1>
            <div className="mt-1 text-sm text-slate-600">
              {ticket.category} · <span className="font-medium">{ticket.status}</span>
            </div>
          </div>
          <div className="text-xs text-slate-500 sm:text-right">更新：{new Date(ticket.updated_at).toLocaleString()}</div>
        </div>
      </div>

      {role === 'Admin' && !isClosed ? (
        <AdminAssignmentPanel ticketId={ticket.id} currentAssigneeId={assigneeId} />
      ) : null}

      {role === 'Agent' && !isClosed ? (
        <AgentActionsPanel
          ticketId={ticket.id}
          status={ticket.status}
          assigneeId={assigneeId}
          currentUserId={currentUserId}
        />
      ) : null}

      {(role === 'Agent' || role === 'Admin') && !isClosed ? (
        <AgentStatusControls ticketId={ticket.id} status={ticket.status} />
      ) : null}

      {(role === 'Agent' || role === 'Admin') && !isClosed ? (
        <InternalNoteBox ticketId={ticket.id} />
      ) : null}

      <TicketWriteControls role={role} ticketId={ticket.id} status={ticket.status} />

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-700">時間軸</h2>
        <MessageTimeline messages={ticket.messages} showInternal={showInternal} />
      </div>
    </div>
  )
}
