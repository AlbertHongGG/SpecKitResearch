import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { TicketStatus } from './tickets'
import type { MessageResponse, TicketStatusResponse } from './ticketActions'

export function useTakeTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<TicketStatusResponse>(`/tickets/${ticketId}/take`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      qc.invalidateQueries({ queryKey: ['agent', 'tickets'] })
    },
  })
}

export function useCancelTake(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<TicketStatusResponse>(`/tickets/${ticketId}/cancel-take`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      qc.invalidateQueries({ queryKey: ['agent', 'tickets'] })
    },
  })
}

export function useAgentChangeStatus(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { from_status: TicketStatus; to_status: TicketStatus }) =>
      apiFetch<TicketStatusResponse>(`/tickets/${ticketId}/status`, { method: 'POST', json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      qc.invalidateQueries({ queryKey: ['agent', 'tickets'] })
    },
  })
}

export function usePostInternalNote(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { content: string }) =>
      apiFetch<MessageResponse>(`/tickets/${ticketId}/internal-notes`, { method: 'POST', json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
    },
  })
}
