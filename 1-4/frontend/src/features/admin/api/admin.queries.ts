import { useMutation, useQuery } from '@tanstack/react-query'
import { apiRequest } from '../../../api/http'
import { useAuth } from '../../../app/auth'
import type { ApiUser } from '../../../api/auth'

export type DashboardRange = 'last_7_days' | 'last_30_days'

export type DashboardResponse = {
  sla: {
    first_response_time: {
      avg_seconds: number | null
      p50_seconds: number | null
      p90_seconds: number | null
    }
    resolution_time: {
      avg_seconds: number | null
      p50_seconds: number | null
      p90_seconds: number | null
    }
  }
  status_distribution: Array<{ status: string; count: number }>
  agent_load: Array<{ agent_id: string; in_progress_count: number }>
}

export function useAdminDashboardQuery(params: { range: DashboardRange }) {
  const { state } = useAuth()

  return useQuery({
    queryKey: ['admin', 'dashboard', { range: params.range }],
    enabled: state.status === 'authenticated',
    queryFn: async () => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<DashboardResponse>({
        path: `/admin/dashboard?range=${params.range}`,
        method: 'GET',
        token: state.token,
      })
    },
  })
}

export function useAdminCreateUserMutation() {
  const { state } = useAuth()

  return useMutation({
    mutationFn: async (params: {
      email: string
      role: 'Customer' | 'Agent' | 'Admin'
      is_active?: boolean
    }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ user: ApiUser }>({
        path: '/admin/users',
        method: 'POST',
        token: state.token,
        body: params,
      })
    },
  })
}

export function useAdminUpdateUserMutation() {
  const { state } = useAuth()

  return useMutation({
    mutationFn: async (params: {
      userId: string
      role?: 'Customer' | 'Agent' | 'Admin'
      is_active?: boolean
    }) => {
      if (state.status !== 'authenticated' || !state.token) {
        throw new Error('Not authenticated')
      }

      return apiRequest<{ user: ApiUser }>({
        path: `/admin/users/${params.userId}`,
        method: 'PATCH',
        token: state.token,
        body: {
          role: params.role,
          is_active: params.is_active,
        },
      })
    },
  })
}
