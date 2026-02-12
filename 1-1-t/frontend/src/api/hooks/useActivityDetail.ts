import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../httpClient';
import type { ActivityDetailResponse } from '../types';

export function useActivityDetail(activityId: string | undefined) {
  return useQuery({
    queryKey: ['activity', activityId],
    enabled: Boolean(activityId),
    queryFn: () => apiFetch<ActivityDetailResponse>(`/activities/${activityId}`),
  });
}
