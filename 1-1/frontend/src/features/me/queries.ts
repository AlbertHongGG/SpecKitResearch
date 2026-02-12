import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '../../api/http'
import type { MyActivitiesResponse } from '../../api/types'

export const meKeys = {
  all: ['me'] as const,
  activities: () => [...meKeys.all, 'activities'] as const,
}

export function useMyActivities() {
  return useQuery({
    queryKey: meKeys.activities(),
    queryFn: () => apiFetch<MyActivitiesResponse>('/me/activities'),
  })
}
