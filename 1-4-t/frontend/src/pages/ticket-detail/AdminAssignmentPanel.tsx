import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/form/Button'
import { FormError } from '../../components/form/FormError'
import { ConflictBanner } from '../../components/states/ConflictBanner'
import { isApiError } from '../../api/errors'
import { useAdminUsers, useAssignTicket } from '../../api/admin'

export function AdminAssignmentPanel(props: {
  ticketId: string
  currentAssigneeId: string | null
  disabled?: boolean
}) {
  const qc = useQueryClient()
  const agentsQ = useAdminUsers({ role: 'Agent', is_active: true })

  const [selected, setSelected] = useState<string | 'UNASSIGNED'>(
    props.currentAssigneeId ?? 'UNASSIGNED',
  )

  const assign = useAssignTicket(props.ticketId)
  const apiError = isApiError(assign.error) ? assign.error : null

  const conflict = useMemo(() => {
    return apiError && apiError.status === 409 ? apiError : null
  }, [apiError])

  const canSubmit = !props.disabled && !assign.isPending && !agentsQ.isLoading

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium">Admin 指派</div>
      <div className="mt-1 text-xs text-slate-500">改派會寫入 audit；Closed 不允許。</div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block flex-1">
          <div className="text-sm font-medium text-slate-700">Assignee</div>
          <select
            className="mt-1 w-full rounded border bg-white px-3 py-2 text-sm"
            value={selected}
            disabled={props.disabled || assign.isPending || agentsQ.isLoading}
            onChange={(e) => setSelected(e.target.value as any)}
          >
            <option value="UNASSIGNED">（未指派）</option>
            {agentsQ.data?.items.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </label>

        <Button
          type="button"
          disabled={!canSubmit}
          onClick={async () => {
            const assignee_id = selected === 'UNASSIGNED' ? null : selected
            await assign.mutateAsync({ assignee_id })
            qc.invalidateQueries({ queryKey: ['tickets', 'detail', props.ticketId] })
          }}
        >
          {assign.isPending ? '更新中…' : '更新指派'}
        </Button>
      </div>

      {conflict ? (
        <div className="mt-3">
          <ConflictBanner
            message={conflict.message}
            onReload={() => {
              qc.invalidateQueries({ queryKey: ['tickets', 'detail', props.ticketId] })
              qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
            }}
          />
        </div>
      ) : null}

      {apiError && apiError.status !== 409 ? (
        <div className="mt-3">
          <FormError message={`${apiError.message}${apiError.requestId ? ` (request_id: ${apiError.requestId})` : ''}`} />
        </div>
      ) : null}
    </div>
  )
}
