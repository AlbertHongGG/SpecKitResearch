'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/shared/apiClient';
import { queryKeys } from '@/lib/shared/queryKeys';

export type MonthlyReportDto = {
  year: number;
  month: number;
  totals: { income: number; expense: number; net: number };
  expenseByCategory: Array<{ categoryId: string; categoryName: string; amount: number; percent: number }>;
  dailySeries: Array<{ date: string; income: number; expense: number }>;
};

export function useMonthlyReport(params: { year: number; month: number }) {
  return useQuery({
    queryKey: queryKeys.monthlyReport(params),
    queryFn: async () => {
      const sp = new URLSearchParams({ year: String(params.year), month: String(params.month) });
      return apiFetch<MonthlyReportDto>(`/api/reports/monthly?${sp.toString()}`);
    },
  });
}
