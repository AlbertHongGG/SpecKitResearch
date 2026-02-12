import { ApiError } from '@/lib/shared/apiError';
import { getMonthRange, toDateKey } from '@/lib/shared/dateRange';
import * as repo from '@/lib/server/repositories/reportRepo';
import { getMonthDateKeysOrThrow } from '@/lib/server/queries/monthRange';

export async function getMonthlyReport(userId: string, year: number, month: number) {
  const { from, to } = getMonthDateKeysOrThrow(year, month);

  const [totals, byCategory, byDayType] = await Promise.all([
    repo.reportTotals(userId, from, to),
    repo.reportExpenseByCategory(userId, from, to),
    repo.reportDailyByType(userId, from, to),
  ]);

  const totalExpense = totals.expense;
  const expenseByCategory = byCategory.map((c) => ({
    ...c,
    percent: totalExpense === 0 ? 0 : Math.round((c.amount / totalExpense) * 1000) / 10,
  }));

  const { start, end } = getMonthRange(year, month);
  // NOTE: date-fns's eachDayOfInterval uses local-time startOfDay internally,
  // which can shift the UTC date key (e.g. Feb 1 -> Jan 31) depending on timezone.
  // We generate keys by iterating UTC midnights instead.
  const dayKeys: string[] = [];
  for (let cur = new Date(start); cur < end; cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)) {
    dayKeys.push(toDateKey(cur));
  }

  const map = new Map<string, { income: number; expense: number }>();
  for (const row of byDayType) {
    const cur = map.get(row.dateKey) ?? { income: 0, expense: 0 };
    if (row.type === 'income') cur.income = row.amount;
    else cur.expense = row.amount;
    map.set(row.dateKey, cur);
  }

  const dailySeries = dayKeys.map((key) => {
    const v = map.get(key) ?? { income: 0, expense: 0 };
    return { date: key, income: v.income, expense: v.expense };
  });

  return {
    year,
    month,
    totals,
    expenseByCategory,
    dailySeries,
  };
}

export async function exportMonthlyCsv(userId: string, year: number, month: number) {
  const { from, to } = getMonthDateKeysOrThrow(year, month);
  const items = await repo.exportMonthlyTransactions(userId, from, to);
  if (!items) throw new ApiError({ status: 500, code: 'EXPORT_FAILED', message: '匯出失敗' });
  return { items, from, to };
}
