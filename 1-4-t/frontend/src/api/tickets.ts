import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'

export type UserRole = 'Customer' | 'Agent' | 'Admin'

export type UserSummary = {
  id: string
  email: string
  role: UserRole
}

export type TicketCategory = 'Account' | 'Billing' | 'Technical' | 'Other'
export type TicketStatus = 'Open' | 'In Progress' | 'Waiting for Customer' | 'Resolved' | 'Closed'

export type TicketSummary = {
  id: string
  title: string
  category: TicketCategory
  status: TicketStatus
  updated_at: string
  assignee?: UserSummary | null
}

export type TicketListResponse = {
  items: TicketSummary[]
  total: number
  limit: number
  offset: number
}

export type TicketMessage = {
  id: string
  ticket_id: string
  author: UserSummary
  role: UserRole
  content: string
  is_internal: boolean
  created_at: string
}

export type TicketDetail = {
  id: string
  title: string
  category: TicketCategory
  status: TicketStatus
  customer: UserSummary
  assignee?: UserSummary | null
  created_at: string
  updated_at: string
  closed_at?: string | null
  messages: TicketMessage[]
}

export type TicketDetailResponse = {
  ticket: TicketDetail
}

export type CreateTicketRequest = {
  title: string
  category: TicketCategory
  description: string
}

export function useMyTickets(params: { status?: TicketStatus; limit?: number; offset?: number } = {}) {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  qs.set('limit', String(limit))
  qs.set('offset', String(offset))

  return useQuery({
    queryKey: ['tickets', 'my', { ...params, limit, offset }],
    queryFn: () => apiFetch<TicketListResponse>(`/tickets?${qs.toString()}`),
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateTicketRequest) => apiFetch<TicketDetailResponse>('/tickets', { method: 'POST', json: body }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tickets', 'my'] })
      queryClient.setQueryData(['tickets', 'detail', data.ticket.id], data)
    },
  })
}

export function useTicketDetail(ticketId: string) {
  return useQuery({
    queryKey: ['tickets', 'detail', ticketId],
    queryFn: () => apiFetch<TicketDetailResponse>(`/tickets/${ticketId}`),
    enabled: !!ticketId,
  })
}
