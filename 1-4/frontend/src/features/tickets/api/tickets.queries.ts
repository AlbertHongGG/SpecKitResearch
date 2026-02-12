import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../api/http'
import { useAuth } from '../../../app/auth'

export type ApiTicketStatus =
  | 'Open'
  | 'In Progress'
  | 'Waiting for Customer'
  | 'Resolved'
  | 'Closed'

export type ApiTicketCategory = 'Account' | 'Billing' | 'Technical' | 'Other'

export type ApiTicket = {
  id: string
  title: string
  category: ApiTicketCategory
  status: ApiTicketStatus
  customer_id: string
  assignee_id: string | null
  created_at: string
  updated_at: string
  closed_at: string | null
}

export type ApiMessage = {
  id: string
  ticket_id: string
  author_id: string
  role: 'Customer' | 'Agent' | 'Admin'
  content: string
  is_internal: boolean
  created_at: string
}

export type TicketTimelineItem =
  | { type: 'message'; message: ApiMessage }
  | {
      type: 'audit'
      action: string
      created_at: string
      metadata: Record<string, unknown>
    }

export function useCustomerTicketsQuery(params: { status?: ApiTicketStatus }) {
  const { state } = useAuth()

  return useQuery({
    queryKey: ['tickets', 'customer', { status: params.status ?? null }],
    enabled: state.status === 'authenticated',
    queryFn: async () => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      const qs = new URLSearchParams()
      if (params.status) qs.set('status', params.status)

      const query = qs.toString()

      return apiRequest<{ tickets: ApiTicket[]; total: number }>({
        path: `/tickets${query ? `?${query}` : ''}`,
        method: 'GET',
        token: state.token,
      })
    },
  })
}

export function useTicketDetailQuery(params: {
  ticketId: string
  enabled?: boolean
}) {
  const { state } = useAuth()

  return useQuery({
    queryKey: ['tickets', 'detail', params.ticketId],
    enabled:
      (params.enabled ?? true) &&
      state.status === 'authenticated' &&
      params.ticketId.length > 0,
    queryFn: async () => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket; timeline: TicketTimelineItem[] }>({
        path: `/tickets/${params.ticketId}`,
        method: 'GET',
        token: state.token,
      })
    },
  })
}

export function useCreateTicketMutation() {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      title: string
      category: ApiTicketCategory
      description: string
    }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket }>({
        path: '/tickets',
        method: 'POST',
        token: state.token,
        body: {
          title: params.title,
          category: params.category,
          description: params.description,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useCreateTicketMessageMutation(params: { ticketId: string }) {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: { content: string }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ message: ApiMessage }>({
        path: `/tickets/${params.ticketId}/messages`,
        method: 'POST',
        token: state.token,
        body: { content: values.content, is_internal: false },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', params.ticketId],
      })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useChangeTicketStatusMutation(params: { ticketId: string }) {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      from_status: ApiTicketStatus
      to_status: ApiTicketStatus
    }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket }>({
        path: `/tickets/${params.ticketId}/status`,
        method: 'POST',
        token: state.token,
        body: values,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', params.ticketId],
      })
      await queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}
