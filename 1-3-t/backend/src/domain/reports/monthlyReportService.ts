import { prisma } from '../../infra/db/prisma';
import { formatDateOnly } from '../transactions/transactionRules';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function getMonthRange(args: { year: number; month: number }) {
  const start = new Date(`${args.year}-${pad2(args.month)}-01`);

  const nextMonth = args.month === 12 ? 1 : args.month + 1;
  const nextYear = args.month === 12 ? args.year + 1 : args.year;
  const end = new Date(`${nextYear}-${pad2(nextMonth)}-01`);

  return { start, end };
}

export type MonthlyReport = {
  year: number;
  month: number;
  totals: {
    totalIncome: number;
    totalExpense: number;
    net: number;
  };
  expenseByCategory: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
    percent: number;
  }>;
  byDay: Array<{
    date: string;
    incomeAmount: number;
    expenseAmount: number;
  }>;
};

export async function getMonthlyReport(args: {
  userId: string;
  year: number;
  month: number;
}): Promise<MonthlyReport> {
  const { start, end } = getMonthRange({ year: args.year, month: args.month });

  const totalsGrouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: {
      userId: args.userId,
      date: {
        gte: start,
        lt: end,
      },
    },
    _sum: { amount: true },
  });

  const totalIncome = totalsGrouped.find((r) => r.type === 'income')?._sum.amount ?? 0;
  const totalExpense = totalsGrouped.find((r) => r.type === 'expense')?._sum.amount ?? 0;

  const byCategoryGrouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId: args.userId,
      type: 'expense',
      date: {
        gte: start,
        lt: end,
      },
    },
    _sum: { amount: true },
  });

  const categoryIds = byCategoryGrouped.map((r) => r.categoryId);
  const categories = categoryIds.length
    ? await prisma.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      })
    : [];

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name] as const));

  const expenseByCategory = byCategoryGrouped
    .map((row) => {
      const amount = row._sum.amount ?? 0;
      const categoryName = categoryNameById.get(row.categoryId) ?? 'Unknown';
      const percent = totalExpense === 0 ? 0 : (amount / totalExpense) * 100;

      return {
        categoryId: row.categoryId,
        categoryName,
        amount,
        percent,
      };
    })
    .filter((r) => r.amount > 0)
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount;
      return a.categoryName.localeCompare(b.categoryName, 'zh-Hant');
    });

  const byDayGrouped = await prisma.transaction.groupBy({
    by: ['date', 'type'],
    where: {
      userId: args.userId,
      date: {
        gte: start,
        lt: end,
      },
    },
    _sum: { amount: true },
  });

  const byDayMap = new Map<string, { incomeAmount: number; expenseAmount: number }>();

  for (const row of byDayGrouped) {
    const date = formatDateOnly(row.date);
    const existing = byDayMap.get(date) ?? { incomeAmount: 0, expenseAmount: 0 };
    const amount = row._sum.amount ?? 0;

    if (row.type === 'income') {
      existing.incomeAmount = amount;
    } else {
      existing.expenseAmount = amount;
    }

    byDayMap.set(date, existing);
  }

  const byDay = Array.from(byDayMap.entries())
    .map(([date, v]) => ({ date, incomeAmount: v.incomeAmount, expenseAmount: v.expenseAmount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    year: args.year,
    month: args.month,
    totals: {
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
    },
    expenseByCategory,
    byDay,
  };
}
