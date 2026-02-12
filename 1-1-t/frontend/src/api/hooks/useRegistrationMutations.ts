import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pushToast } from '../../components/feedback/toastStore';
import { toToastError } from '../errors';
import { apiFetch } from '../httpClient';
import type { RegistrationResult } from '../types';

function newIdempotencyKey() {
  return globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useRegistrationMutations() {
  const qc = useQueryClient();

  const register = useMutation({
    mutationFn: async (activityId: string) => {
      return apiFetch<RegistrationResult>(`/activities/${activityId}/registrations`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': newIdempotencyKey(),
        },
      });
    },
    onSuccess: async () => {
      pushToast({ type: 'success', message: '報名成功' });
      await qc.invalidateQueries({ queryKey: ['activities'] });
      await qc.invalidateQueries({ queryKey: ['me', 'activities'] });
      await qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (err: any) => {
      pushToast({ type: 'error', ...toToastError(err, '報名失敗') });
    },
  });

  const cancel = useMutation({
    mutationFn: async (activityId: string) => {
      return apiFetch<RegistrationResult>(`/activities/${activityId}/registrations/me`, {
        method: 'DELETE',
        headers: {
          'Idempotency-Key': newIdempotencyKey(),
        },
      });
    },
    onSuccess: async () => {
      pushToast({ type: 'success', message: '已取消報名' });
      await qc.invalidateQueries({ queryKey: ['activities'] });
      await qc.invalidateQueries({ queryKey: ['me', 'activities'] });
      await qc.invalidateQueries({ queryKey: ['activity'] });
    },
    onError: (err: any) => {
      pushToast({ type: 'error', ...toToastError(err, '取消失敗') });
    },
  });

  return { register, cancel };
}
