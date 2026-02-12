'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';
import { toast } from '@/lib/shared/toast';

export function useDeleteTransaction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch<{ deleted: true }>(`/api/transactions/${id}`, { method: 'DELETE' });
      return res;
    },
    onSuccess: async () => {
      toast.success('已刪除帳務');
      await qc.invalidateQueries({ queryKey: ['transactions'] });
      await qc.invalidateQueries({ queryKey: ['monthlyReport'] });
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? '刪除失敗');
    },
  });
}
