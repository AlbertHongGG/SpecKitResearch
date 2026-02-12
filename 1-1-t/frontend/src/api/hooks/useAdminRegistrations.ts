import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../httpClient';
import type { AdminRegistrationsResponse } from '../types';

export function useAdminRegistrations(input: {
  activityId: string;
  includeCancelled: boolean;
}) {
  const list = useQuery({
    enabled: Boolean(input.activityId),
    queryKey: ['admin', 'activities', input.activityId, 'registrations', input.includeCancelled],
    queryFn: () => {
      const q = input.includeCancelled ? '?includeCancelled=true' : '';
      return apiFetch<AdminRegistrationsResponse>(
        `/admin/activities/${input.activityId}/registrations${q}`,
      );
    },
  });

  return { list };
}
