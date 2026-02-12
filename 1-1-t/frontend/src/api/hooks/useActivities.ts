import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../httpClient';
import type { ActivityListResponse } from '../types';

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: () => apiFetch<ActivityListResponse>('/activities'),
  });
}
