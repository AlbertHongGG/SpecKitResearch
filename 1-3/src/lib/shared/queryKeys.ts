export const queryKeys = {
  categories: ['categories'] as const,
  transactions: (params: { page: number; pageSize: number; dateFrom?: string; dateTo?: string }) =>
    ['transactions', params] as const,
  monthlyReport: (params: { year: number; month: number }) => ['monthlyReport', params] as const,
};
