'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';

export type CategoryDto = {
  id: string;
  name: string;
  type: 'income' | 'expense' | 'both';
  isActive: boolean;
  isDefault: boolean;
};

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: async () => {
      const res = await apiFetch<{ categories: CategoryDto[] }>('/api/categories');
      return res.categories;
    },
  });
}
