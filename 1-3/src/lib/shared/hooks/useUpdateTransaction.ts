'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';
import { toast } from '@/lib/shared/toast';

export function useUpdateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; patch: { type?: 'income' | 'expense'; amount?: number; categoryId?: string; date?: string; note?: string } }) => {
      const res = await apiFetch<{ transaction: any }>(`/api/transactions/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.patch),
      });
      return res.transaction;
    },
    onSuccess: async () => {
      toast.success('已更新帳務');
      await qc.invalidateQueries({ queryKey: ['transactions'] });
      await qc.invalidateQueries({ queryKey: queryKeys.categories });
      await qc.invalidateQueries({ queryKey: ['monthlyReport'] });
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? '更新失敗');
    },
  });
}
