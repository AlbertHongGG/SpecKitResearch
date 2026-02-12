'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';
import { toast } from '@/lib/shared/toast';

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; type: 'income' | 'expense' | 'both' }) => {
      const res = await apiFetch<{ category: any }>('/api/categories', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      return res.category;
    },
    onSuccess: async () => {
      toast.success('已新增類別');
      await qc.invalidateQueries({ queryKey: queryKeys.categories });
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? '新增類別失敗');
    },
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: { name?: string; type?: 'income' | 'expense' | 'both'; isActive?: boolean } }) => {
      const res = await apiFetch<{ category: any }>(`/api/categories/${input.id}`, {
        method: 'PATCH',
        body: JSON.stringify(input.patch),
      });
      return res.category;
    },
    onSuccess: async () => {
      toast.success('已更新類別');
      await qc.invalidateQueries({ queryKey: queryKeys.categories });
      await qc.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (err) => {
      toast.error((err as any)?.message ?? '更新類別失敗');
    },
  });
}
