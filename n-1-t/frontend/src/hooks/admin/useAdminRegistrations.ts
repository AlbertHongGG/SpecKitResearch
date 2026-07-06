import { useMutation, useQuery } from '@tanstack/react-query';

import { exportAdminRegistrationsCsv, listAdminRegistrations } from '../../api/admin';

export function useAdminRegistrations(activityId: string | undefined) {
  return useQuery({
    queryKey: ['admin-registrations', activityId],
    queryFn: () => listAdminRegistrations(activityId as string),
    enabled: !!activityId,
    staleTime: 5_000,
    retry: false,
  });
}

export function useExportAdminRegistrationsCsv(activityId: string | undefined) {
  return useMutation({
    mutationFn: async (idempotencyKey: string) => {
      return exportAdminRegistrationsCsv(activityId as string, { idempotencyKey });
    },
  });
}
