import { prisma } from '@/lib/server/db';

export type TransactionType = 'income' | 'expense';

export async function listTransactions(params: {
  userId: string;
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { userId, page, pageSize, dateFrom, dateTo } = params;

  const where: any = { userId };
  if (dateFrom || dateTo) {
    where.dateKey = {};
    if (dateFrom) where.dateKey.gte = dateFrom;
    if (dateTo) where.dateKey.lte = dateTo;
  }

  const [total, items] = await prisma.$transaction([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: [{ dateKey: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, items };
}

export async function createTransaction(input: {
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  dateKey: string;
  date: Date;
  note?: string;
}) {
  return prisma.transaction.create({ data: input });
}

export async function getTransactionById(id: string) {
  return prisma.transaction.findUnique({ where: { id } });
}

export async function updateTransaction(id: string, data: any) {
  return prisma.transaction.update({ where: { id }, data });
}

export async function deleteTransaction(id: string) {
  return prisma.transaction.delete({ where: { id } });
}
