import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '../../../api/http'
import { useAuth } from '../../../app/auth'
import type {
  ApiMessage,
  ApiTicket,
  ApiTicketStatus,
} from '../../tickets/api/tickets.queries'

export function useAgentTicketsQuery(params: {
  view: 'unassigned' | 'mine'
  status?: ApiTicketStatus
}) {
  const { state } = useAuth()

  return useQuery({
    queryKey: [
      'tickets',
      'agent',
      { view: params.view, status: params.status ?? null },
    ],
    enabled: state.status === 'authenticated',
    queryFn: async () => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      const qs = new URLSearchParams()
      qs.set('view', params.view)
      if (params.status) qs.set('status', params.status)

      const query = qs.toString()

      return apiRequest<{ tickets: ApiTicket[]; total: number }>({
        path: `/agent/tickets?${query}`,
        method: 'GET',
        token: state.token,
      })
    },
  })
}

export function useTakeTicketMutation(params: { ticketId: string }) {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (state.status !== 'authenticated' || !state.token || !state.user) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket }>({
        path: `/tickets/${params.ticketId}/assignee`,
        method: 'POST',
        token: state.token,
        body: { assignee_id: state.user.id, expected_status: 'Open' },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets', 'agent'] })
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', params.ticketId],
      })
    },
  })
}

export function useAgentChangeTicketStatusMutation(params: {
  ticketId: string
}) {
  const { state } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (values: {
      from_status: ApiTicketStatus
      to_status: ApiTicketStatus
    }) => {
      if (state.status !== 'authenticated' || !state.token || !state.user) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ ticket: ApiTicket }>({
        path: `/tickets/${params.ticketId}/status`,
        method: 'POST',
        token: state.token,
        body: {
          ...values,
          expected_assignee_id: state.user.id,
        },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets', 'agent'] })
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', params.ticketId],
      })
    },
  })
}

export function useCreateInternalNoteMutation(params: { ticketId: string }) {
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
        body: { content: values.content, is_internal: true },
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tickets', 'agent'] })
      await queryClient.invalidateQueries({
        queryKey: ['tickets', 'detail', params.ticketId],
      })
    },
  })
}
