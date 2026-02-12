import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api/http'
import type {
  ActivityStatus,
  ActivityStatusChangeRequest,
  ActivityUpsertRequest,
  ActivityUpsertResponse,
  AdminActivitiesListResponse,
  RegistrationRosterResponse,
} from '../../api/types'

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const adminKeys = {
  all: ['admin'] as const,
  activities: () => [...adminKeys.all, 'activities'] as const,
  activity: (activityId: string) => [...adminKeys.activities(), activityId] as const,
  roster: (activityId: string) => [...adminKeys.all, 'roster', activityId] as const,
}

export function useAdminActivities() {
  return useQuery({
    queryKey: adminKeys.activities(),
    queryFn: () => apiFetch<AdminActivitiesListResponse>('/admin/activities'),
  })
}

export function useAdminActivity(activityId: string) {
  return useQuery({
    queryKey: adminKeys.activity(activityId),
    queryFn: () => apiFetch<ActivityUpsertResponse>(`/admin/activities/${encodeURIComponent(activityId)}`),
    enabled: !!activityId,
  })
}

export function useCreateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: ActivityUpsertRequest) => apiFetch<ActivityUpsertResponse>('/admin/activities', { method: 'POST', json: body }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: adminKeys.activities() })
    },
  })
}

export function useUpdateActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { activityId: string; body: ActivityUpsertRequest }) =>
      apiFetch<ActivityUpsertResponse>(`/admin/activities/${encodeURIComponent(params.activityId)}`, {
        method: 'PATCH',
        json: params.body,
      }),
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: adminKeys.activities() })
      await qc.invalidateQueries({ queryKey: adminKeys.activity(variables.activityId) })
    },
  })
}

export function useChangeActivityStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (params: { activityId: string; newStatus: ActivityStatus }) => {
      const key = makeIdempotencyKey()
      const body: ActivityStatusChangeRequest = { new_status: params.newStatus }
      return apiFetch<ActivityUpsertResponse>(
        `/admin/activities/${encodeURIComponent(params.activityId)}/status`,
        {
          method: 'POST',
          json: body,
          headers: { 'Idempotency-Key': key },
        },
      )
    },
    onSuccess: async (_data, variables) => {
      await qc.invalidateQueries({ queryKey: adminKeys.activities() })
      await qc.invalidateQueries({ queryKey: adminKeys.activity(variables.activityId) })
    },
  })
}

export function useAdminRoster(activityId: string) {
  return useQuery({
    queryKey: adminKeys.roster(activityId),
    queryFn: () => apiFetch<RegistrationRosterResponse>(`/admin/activities/${encodeURIComponent(activityId)}/registrations`),
    enabled: !!activityId,
  })
}

export async function downloadRosterCsv(activityId: string) {
  return apiFetch<string>(`/admin/activities/${encodeURIComponent(activityId)}/registrations/export`)
}
