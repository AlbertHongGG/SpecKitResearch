import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { UserRole } from './tickets'

export type DashboardRange = 'last_7_days' | 'last_30_days'

export type DashboardResponse = {
  sla: {
    first_response_time_ms_avg: number | null
    resolution_time_ms_avg: number | null
  }
  status_distribution: Record<string, number>
  agent_load: Array<{ agent_id: string; in_progress_count: number }>
}

export type AdminUser = {
  id: string
  email: string
  role: UserRole
  is_active: boolean
  created_at: string
}

export type AdminUserListResponse = {
  items: AdminUser[]
  total: number
}

export type AdminUserResponse = {
  user: AdminUser
}

export type CreateAdminUserRequest = {
  email: string
  password: string
  role: Exclude<UserRole, 'Customer'>
}

export type UpdateAdminUserRequest = {
  is_active?: boolean | null
  role?: Exclude<UserRole, 'Customer'> | null
}

export type AssignTicketRequest = {
  assignee_id: string | null
}

export type TicketAssigneeResponse = {
  ticket: {
    id: string
    assignee_id: string | null
    updated_at: string
  }
}

export function useDashboardMetrics(params: { range: DashboardRange }) {
  const qs = new URLSearchParams()
  qs.set('range', params.range)

  return useQuery({
    queryKey: ['admin', 'dashboard', params],
    queryFn: () => apiFetch<DashboardResponse>(`/admin/dashboard?${qs.toString()}`),
  })
}

export function useAssignTicket(ticketId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: AssignTicketRequest) =>
      apiFetch<TicketAssigneeResponse>(`/admin/tickets/${ticketId}/assignee`, {
        method: 'PUT',
        json: body,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', 'detail', ticketId] })
      qc.invalidateQueries({ queryKey: ['agent', 'tickets'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useAdminUsers(params: { role?: Exclude<UserRole, 'Customer'>; is_active?: boolean } = {}) {
  const qs = new URLSearchParams()
  if (params.role) qs.set('role', params.role)
  if (params.is_active !== undefined) qs.set('is_active', String(params.is_active))

  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => apiFetch<AdminUserListResponse>(`/admin/users${qs.toString() ? `?${qs.toString()}` : ''}`),
  })
}

export function useCreateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateAdminUserRequest) =>
      apiFetch<AdminUserResponse>('/admin/users', { method: 'POST', json: body }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

export function useUpdateAdminUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { userId: string; body: UpdateAdminUserRequest }) =>
      apiFetch<AdminUserResponse>(`/admin/users/${params.userId}`, {
        method: 'PATCH',
        json: params.body,
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] })
      qc.invalidateQueries({ queryKey: ['admin', 'users', { role: vars.body.role ?? undefined }] })
    },
  })
}
