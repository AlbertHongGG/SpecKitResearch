'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';

export type TransactionDto = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  date: string;
  note?: string;
};

export type DailySummaryDto = {
  date: string;
  incomeTotal: number;
  expenseTotal: number;
};

export function useTransactions(params: {
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: queryKeys.transactions(params),
    queryFn: async () => {
      const sp = new URLSearchParams({
        page: String(params.page),
        pageSize: String(params.pageSize),
      });
      if (params.dateFrom) sp.set('dateFrom', params.dateFrom);
      if (params.dateTo) sp.set('dateTo', params.dateTo);

      return apiFetch<{ items: TransactionDto[]; pageInfo: { page: number; pageSize: number; total: number }; dailySummaries: DailySummaryDto[] }>(
        `/api/transactions?${sp.toString()}`,
      );
    },
  });
}
