import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { apiRequest } from '../../../api/http'
import { useAuth } from '../../../app/auth'
import type { ApiTicket, ApiTicketStatus } from '../api/tickets.queries'
import { ErrorState } from '../../../components/states/ErrorState'

const UuidSchema = z.string().uuid()

export function AdminAssignmentControl(props: {
  ticketId: string
  status: ApiTicketStatus
  assigneeId: string | null
}) {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  const [assigneeIdInput, setAssigneeIdInput] = useState<string>(
    props.assigneeId ?? '',
  )

  const mutation = useMutation({
    mutationFn: async (params: { assignee_id: string | null }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket }>({
        path: `/tickets/${props.ticketId}/assignee`,
        method: 'POST',
        token: state.token,
        body: {
          assignee_id: params.assignee_id,
          expected_status: props.status,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', props.ticketId],
      })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-semibold">Admin 指派</div>
      <div className="mt-1 text-xs text-gray-500">
        直接輸入 agent_id（UUID）。目前沒有提供 agent 清單 API。
      </div>

      {mutation.error ? (
        <div className="mt-3 rounded border">
          <ErrorState error={mutation.error} title="指派失敗" />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          className="w-full min-w-[18rem] flex-1 rounded border px-3 py-2 text-sm"
          value={assigneeIdInput}
          placeholder="agent uuid（留空代表取消指派）"
          disabled={mutation.isPending}
          onChange={(e) => setAssigneeIdInput(e.target.value)}
        />
        <button
          type="button"
          disabled={mutation.isPending}
          className="rounded bg-gray-900 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => {
            const trimmed = assigneeIdInput.trim()
            if (!trimmed) {
              mutation.mutate({ assignee_id: null })
              return
            }

            const parsed = UuidSchema.safeParse(trimmed)
            if (!parsed.success) {
              mutation.reset()
              mutation.mutateAsync({ assignee_id: trimmed }).catch(() => {})
              return
            }

            mutation.mutate({ assignee_id: parsed.data })
          }}
        >
          套用
        </button>
        <button
          type="button"
          disabled={mutation.isPending}
          className="rounded border px-3 py-2 text-sm disabled:opacity-50"
          onClick={() => {
            setAssigneeIdInput('')
            mutation.mutate({ assignee_id: null })
          }}
        >
          取消指派
        </button>
      </div>
    </div>
  )
}
