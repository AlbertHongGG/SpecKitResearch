import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '../../api/http'
import type { CancelResponse, RegisterResponse } from '../../api/types'
import { activitiesKeys } from '../activities/queries'
import { meKeys } from '../me/queries'

function makeIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function useRegisterMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { activityId: string }) => {
      const key = makeIdempotencyKey()
      return apiFetch<RegisterResponse>(`/activities/${encodeURIComponent(params.activityId)}/registrations`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': key,
        },
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: activitiesKeys.all })
      void queryClient.invalidateQueries({ queryKey: activitiesKeys.detail(variables.activityId) })
    },
  })
}

export function useCancelMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { activityId: string }) => {
      const key = makeIdempotencyKey()
      return apiFetch<CancelResponse>(`/activities/${encodeURIComponent(params.activityId)}/registrations`, {
        method: 'DELETE',
        headers: {
          'Idempotency-Key': key,
        },
      })
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: meKeys.activities() })
      void queryClient.invalidateQueries({ queryKey: activitiesKeys.all })
      void queryClient.invalidateQueries({ queryKey: activitiesKeys.detail(variables.activityId) })
    },
  })
}

