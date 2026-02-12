import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/http'
import type { ActivitiesListResponse, ActivityDetailResponse } from '../../api/types'

export const activitiesKeys = {
  all: ['activities'] as const,
  list: (status?: string) => [...activitiesKeys.all, 'list', status ?? 'all'] as const,
  detail: (activityId: string) => [...activitiesKeys.all, 'detail', activityId] as const,
}

export function useActivitiesList(params?: { status?: 'published' | 'full' }) {
  return useQuery({
    queryKey: activitiesKeys.list(params?.status),
    queryFn: () => {
      const q = params?.status ? `?status=${encodeURIComponent(params.status)}` : ''
      return apiFetch<ActivitiesListResponse>(`/activities${q}`)
    },
  })
}

export function useActivityDetail(activityId: string) {
  return useQuery({
    queryKey: activitiesKeys.detail(activityId),
    queryFn: () => apiFetch<ActivityDetailResponse>(`/activities/${encodeURIComponent(activityId)}`),
  })
}
