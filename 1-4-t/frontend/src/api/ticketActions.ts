import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { TicketMessage, TicketStatus } from './tickets'

export type MessageResponse = {
  message: TicketMessage
  ticket: {
    id: string
    status: TicketStatus
    updated_at: string
  }
}

export type TicketStatusResponse = {
  ticket: {
    id: string
    status: TicketStatus
    assignee_id?: string | null
    updated_at: string
    closed_at?: string | null
  }
}

export function usePostMessage(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { content: string }) =>
      apiFetch<MessageResponse>(`/tickets/${ticketId}/messages`, { method: 'POST', json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
    },
  })
}

export function useChangeStatus(ticketId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { from_status: TicketStatus; to_status: TicketStatus }) =>
      apiFetch<TicketStatusResponse>(`/tickets/${ticketId}/status`, { method: 'POST', json: body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
    },
  })
}
