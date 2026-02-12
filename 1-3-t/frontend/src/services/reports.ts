import { httpJson } from './http';

export type MonthlyTotals = {
  totalIncome: number;
  totalExpense: number;
  net: number;
};

export type CategorySpend = {
  categoryId: string;
  categoryName: string;
  amount: number;
  percent: number;
};

export type DayIncomeExpense = {
  date: string;
  incomeAmount: number;
  expenseAmount: number;
};

export type MonthlyReport = {
  year: number;
  month: number;
  totals: MonthlyTotals;
  expenseByCategory: CategorySpend[];
  byDay: DayIncomeExpense[];
};

export async function getMonthlyReport(args: { year: number; month: number }): Promise<MonthlyReport> {
  return httpJson({
    path: '/reports/monthly',
    query: { year: args.year, month: args.month },
  });
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export function makeMonthlyCsvFilename(args: { year: number; month: number }) {
  return `transactions_${args.year}_${pad2(args.month)}.csv`;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number>) {
  const url = new URL(path, baseUrl);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

export async function downloadMonthlyCsv(args: {
  year: number;
  month: number;
}): Promise<{ filename: string; blob: Blob }> {
  const baseUrl =
    import.meta.env.VITE_API_BASE_URL ??
    (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  const apiPrefix = import.meta.env.VITE_API_PREFIX ?? '';

  const url = buildUrl(baseUrl, `${apiPrefix}/reports/monthly/csv`, {
    year: args.year,
    month: args.month,
  });

  const res = await fetch(url, {
    method: 'GET',
    credentials: 'include',
    headers: {
      accept: 'text/csv',
    },
  });

  if (!res.ok) {
    // Let callers handle via generic error mapping.
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw {
      type: 'api',
      status: res.status,
      error: {
        code: 'UNKNOWN_ERROR',
        message: '請求失敗',
        requestId: res.headers.get('x-request-id') ?? 'unknown',
      },
    };
  }

  const blob = await res.blob();

  // Prefer contract-driven deterministic naming.
  const filename = makeMonthlyCsvFilename(args);

  return { filename, blob };
}
