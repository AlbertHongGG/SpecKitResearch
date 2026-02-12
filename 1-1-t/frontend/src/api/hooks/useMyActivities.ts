import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../httpClient';
import type { MyActivitiesResponse } from '../types';

export function useMyActivities() {
  return useQuery({
    queryKey: ['me', 'activities'],
    queryFn: () => apiFetch<MyActivitiesResponse>('/me/activities'),
  });
}
