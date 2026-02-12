import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/form/Button'
import { ConflictBanner } from '../../components/states/ConflictBanner'
import { isApiError } from '../../api/errors'
import { useCancelTake, useTakeTicket } from '../../api/agentActions'

export function AgentActionsPanel(props: {
  ticketId: string
  status: string
  assigneeId: string | null
  currentUserId: string
}) {
  const qc = useQueryClient()
  const take = useTakeTicket(props.ticketId)
  const cancel = useCancelTake(props.ticketId)

  const conflict = useMemo(() => {
    const err = (take.error ?? cancel.error)
    return isApiError(err) && err.status === 409 ? err : null
  }, [take.error, cancel.error])

  const canTake = props.status === 'Open' && props.assigneeId === null
  const canCancel = props.status === 'In Progress' && props.assigneeId === props.currentUserId

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">接手</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" disabled={!canTake || take.isPending} onClick={() => take.mutate()}>
          {take.isPending ? '處理中…' : '接手'}
        </Button>
        <Button type="button" variant="secondary" disabled={!canCancel || cancel.isPending} onClick={() => cancel.mutate()}>
          {cancel.isPending ? '處理中…' : '取消接手'}
        </Button>
      </div>

      {conflict ? (
        <div className="mt-3">
          <ConflictBanner
            message={conflict.message}
            onReload={() => {
              qc.invalidateQueries({ queryKey: ['tickets', 'detail', props.ticketId] })
              qc.invalidateQueries({ queryKey: ['agent', 'tickets'] })
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
