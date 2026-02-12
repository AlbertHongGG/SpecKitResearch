import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { isApiError } from '../../api/errors'
import { useAgentChangeStatus } from '../../api/agentActions'
import type { TicketStatus } from '../../api/tickets'

export function AgentStatusControls(props: { ticketId: string; status: TicketStatus; disabled?: boolean }) {
  const change = useAgentChangeStatus(props.ticketId)
  const apiError = isApiError(change.error) ? change.error : null

  const canWaiting = props.status === 'In Progress'
  const canResolve = props.status === 'In Progress'
  const canReopen = props.status === 'Resolved'

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">狀態操作</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={props.disabled || change.isPending || !canWaiting}
          onClick={() => change.mutate({ from_status: 'In Progress', to_status: 'Waiting for Customer' })}
        >
          等待客戶回覆
        </Button>
        <Button
          type="button"
          disabled={props.disabled || change.isPending || !canResolve}
          onClick={() => change.mutate({ from_status: 'In Progress', to_status: 'Resolved' })}
        >
          標記已解決
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={props.disabled || change.isPending || !canReopen}
          onClick={() => change.mutate({ from_status: 'Resolved', to_status: 'In Progress' })}
        >
          重新開啟
        </Button>
      </div>
      {apiError ? (
        <div className="mt-3">
          <FormError
            message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`}
          />
        </div>
      ) : null}
    </div>
  )
}
