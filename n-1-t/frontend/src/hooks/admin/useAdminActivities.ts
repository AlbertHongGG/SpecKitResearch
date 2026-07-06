import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { ActivityDetail, ActivityStatus, AdminUpsertActivityRequest } from '../../api/types';
import {
  changeAdminActivityStatus,
  createAdminActivity,
  listAdminActivities,
  updateAdminActivity,
} from '../../api/admin';

export function useAdminActivitiesList(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin-activities'],
    queryFn: listAdminActivities,
    enabled: options?.enabled ?? true,
    staleTime: 5_000,
    retry: false,
  });
}

export function useCreateAdminActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAdminActivity,
    onSuccess: async (created: ActivityDetail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activity', created.id] }),
      ]);
    },
  });
}

export function useUpdateAdminActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { activityId: string; body: AdminUpsertActivityRequest }) => {
      return updateAdminActivity(params.activityId, params.body);
    },
    onSuccess: async (updated: ActivityDetail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activity', updated.id] }),
      ]);
    },
  });
}

export function useChangeAdminActivityStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { activityId: string; toStatus: ActivityStatus }) => {
      return changeAdminActivityStatus(params.activityId, { toStatus: params.toStatus });
    },
    onSuccess: async (updated: ActivityDetail) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activity', updated.id] }),
      ]);
    },
  });
}
