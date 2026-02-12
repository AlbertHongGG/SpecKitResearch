'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';
import { toast } from '@/lib/shared/toast';

export function useCreateTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { type: 'income' | 'expense'; amount: number; categoryId: string; date: string; note?: string }) => {
      const res = await apiFetch<{ transaction: any }>('/api/transactions', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.transaction;
    },
    onSuccess: async () => {
      toast.success('已新增帳務');
      await qc.invalidateQueries({ queryKey: ['transactions'] });
      await qc.invalidateQueries({ queryKey: ['monthlyReport'] });
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? '新增失敗');
    },
  });
}
