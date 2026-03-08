import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';
import type { ReplayScope } from '@app/contracts';

export function useReplayMutation(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (scope: ReplayScope) => {
      const res = await apiFetch<{ replay_run_id: string }>(`/api/orders/${orderId}/replay`, {
        method: 'POST',
        body: JSON.stringify({ scope }),
      });
      return res;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
