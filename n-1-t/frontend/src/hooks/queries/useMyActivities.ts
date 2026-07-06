import { useQuery } from '@tanstack/react-query';

import { listMyActivities } from '../../api/member';

export function useMyActivities(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['my-activities'],
    queryFn: listMyActivities,
    enabled: options?.enabled ?? true,
    staleTime: 10_000,
    retry: false,
  });
}
