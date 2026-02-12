import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { TicketListResponse, TicketStatus } from './tickets'

export type AgentTicketsView = 'unassigned' | 'mine'

export function agentTicketsQueryKey(params: {
  view: AgentTicketsView
  status?: TicketStatus
  limit?: number
  offset?: number
}) {
  return ['agent', 'tickets', params] as const
}

export function useAgentTickets(params: {
  view: AgentTicketsView
  status?: TicketStatus
  limit?: number
  offset?: number
}) {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0
  const qs = new URLSearchParams()
  qs.set('view', params.view)
  if (params.status) qs.set('status', params.status)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))

  return useQuery({
    queryKey: agentTicketsQueryKey({ ...params, limit, offset }),
    queryFn: () => apiFetch<TicketListResponse>(`/agent/tickets?${qs.toString()}`),
  })
}
