import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pushToast } from '../../components/feedback/toastStore';
import { toToastError } from '../errors';
import { apiFetch } from '../httpClient';
import type {
  Activity,
  ActivityTransitionAction,
  AdminActivitiesResponse,
} from '../types';

export function useAdminActivities() {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['admin', 'activities'],
    queryFn: () => apiFetch<AdminActivitiesResponse>('/admin/activities'),
  });

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      date: string;
      deadline: string;
      location: string;
      capacity: number;
    }) => {
      return apiFetch<Activity>('/admin/activities', {
        method: 'POST',
        json: input,
      });
    },
    onSuccess: async () => {
      pushToast({ type: 'success', message: '活動已建立' });
      await qc.invalidateQueries({ queryKey: ['admin', 'activities'] });
      await qc.invalidateQueries({ queryKey: ['activities'] });
    },
    onError: (err: any) => {
      pushToast({ type: 'error', ...toToastError(err, '建立失敗') });
    },
  });

  const update = useMutation({
    mutationFn: async (input: {
      id: string;
      patch: Partial<{
        title: string;
        description: string;
        date: string;
        deadline: string;
        location: string;
        capacity: number;
      }>;
    }) => {
      return apiFetch<Activity>(`/admin/activities/${input.id}`, {
        method: 'PATCH',
        json: input.patch,
      });
    },
    onSuccess: async () => {
      pushToast({ type: 'success', message: '活動已更新' });
      await qc.invalidateQueries({ queryKey: ['admin', 'activities'] });
      await qc.invalidateQueries({ queryKey: ['activities'] });
      await qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (err: any) => {
      pushToast({ type: 'error', ...toToastError(err, '更新失敗') });
    },
  });

  const transition = useMutation({
    mutationFn: async (input: { id: string; action: ActivityTransitionAction }) => {
      return apiFetch<Activity>(`/admin/activities/${input.id}/transitions`, {
        method: 'POST',
        json: { action: input.action },
      });
    },
    onSuccess: async () => {
      pushToast({ type: 'success', message: '狀態已更新' });
      await qc.invalidateQueries({ queryKey: ['admin', 'activities'] });
      await qc.invalidateQueries({ queryKey: ['activities'] });
      await qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (err: any) => {
      pushToast({ type: 'error', ...toToastError(err, '操作失敗') });
    },
  });

  return { list, create, update, transition };
}
