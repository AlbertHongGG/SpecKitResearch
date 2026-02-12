import { prisma } from '@/lib/server/db';

export async function reportTotals(userId: string, from: string, to: string) {
  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId, dateKey: { gte: from, lt: to } },
    _sum: { amount: true },
  });

  const income = grouped.find((g) => g.type === 'income')?._sum.amount ?? 0;
  const expense = grouped.find((g) => g.type === 'expense')?._sum.amount ?? 0;
  return { income, expense, net: income - expense };
}

export async function reportExpenseByCategory(userId: string, from: string, to: string) {
  const rows = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { userId, type: 'expense', dateKey: { gte: from, lt: to } },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
  });

  const categoryIds = rows.map((r) => r.categoryId);
  const categories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(categories.map((c) => [c.id, c.name]));

  return rows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: nameMap.get(r.categoryId) ?? 'Unknown',
    amount: r._sum.amount ?? 0,
  }));
}

export async function reportDailyByType(userId: string, from: string, to: string) {
  const rows = await prisma.transaction.groupBy({
    by: ['dateKey', 'type'],
    where: { userId, dateKey: { gte: from, lt: to } },
    _sum: { amount: true },
    orderBy: [{ dateKey: 'asc' }],
  });

  return rows.map((r) => ({
    dateKey: r.dateKey,
    type: r.type,
    amount: r._sum.amount ?? 0,
  }));
}

export async function exportMonthlyTransactions(userId: string, from: string, to: string) {
  return prisma.transaction.findMany({
    where: { userId, dateKey: { gte: from, lt: to } },
    orderBy: [{ dateKey: 'asc' }, { createdAt: 'asc' }],
  });
}
