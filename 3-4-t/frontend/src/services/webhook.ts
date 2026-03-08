import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './http';

export function useWebhookResendMutation(orderId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ enqueued: boolean; job_id: string }>(
        `/api/orders/${orderId}/webhook/resend`,
        {
          method: 'POST',
        },
      );
      return res;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['order', orderId] });
    },
  });
}
