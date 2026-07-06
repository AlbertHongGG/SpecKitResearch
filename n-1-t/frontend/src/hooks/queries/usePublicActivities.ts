import { useQuery } from '@tanstack/react-query';

import { getPublicActivityDetail, listPublicActivities } from '../../api/activities';

export function usePublicActivitiesList() {
  return useQuery({
    queryKey: ['public-activities'],
    queryFn: listPublicActivities,
    staleTime: 30_000,
    retry: false,
  });
}

export function usePublicActivityDetail(activityId: string | undefined) {
  return useQuery({
    queryKey: ['public-activity', activityId],
    queryFn: () => getPublicActivityDetail(activityId as string),
    enabled: !!activityId,
    staleTime: 30_000,
    retry: false,
  });
}
