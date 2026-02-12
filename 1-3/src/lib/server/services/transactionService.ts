import { ApiError } from '@/lib/shared/apiError';
import { prisma } from '@/lib/server/db';
import * as repo from '@/lib/server/repositories/transactionRepo';

function toUtcDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export async function createTransaction(userId: string, input: { type: repo.TransactionType; amount: number; categoryId: string; date: string; note?: string }) {
  const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
  if (!category) throw new ApiError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: '類別不存在' });
  if (category.userId !== userId) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: '無權限' });
  if (!category.isActive) throw new ApiError({ status: 422, code: 'CATEGORY_INACTIVE', message: '類別已停用' });

  return repo.createTransaction({
    userId,
    categoryId: input.categoryId,
    type: input.type,
    amount: input.amount,
    dateKey: input.date,
    date: toUtcDate(input.date),
    note: input.note,
  });
}

export async function updateTransaction(userId: string, transactionId: string, input: { type?: repo.TransactionType; amount?: number; categoryId?: string; date?: string; note?: string }) {
  const tx = await repo.getTransactionById(transactionId);
  if (!tx) throw new ApiError({ status: 404, code: 'TX_NOT_FOUND', message: '交易不存在' });
  if (tx.userId !== userId) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: '無權限' });

  if (input.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) throw new ApiError({ status: 404, code: 'CATEGORY_NOT_FOUND', message: '類別不存在' });
    if (category.userId !== userId) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: '無權限' });
    if (!category.isActive) throw new ApiError({ status: 422, code: 'CATEGORY_INACTIVE', message: '類別已停用' });
  }

  const data: any = { ...input };
  if (input.date) {
    data.dateKey = input.date;
    data.date = toUtcDate(input.date);
    delete data.date;
  }

  return repo.updateTransaction(transactionId, data);
}

export async function deleteTransaction(userId: string, transactionId: string) {
  const tx = await repo.getTransactionById(transactionId);
  if (!tx) throw new ApiError({ status: 404, code: 'TX_NOT_FOUND', message: '交易不存在' });
  if (tx.userId !== userId) throw new ApiError({ status: 403, code: 'FORBIDDEN', message: '無權限' });

  await repo.deleteTransaction(transactionId);
  return { deleted: true };
}

export async function listTransactions(params: {
  userId: string;
  page: number;
  pageSize: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  return repo.listTransactions(params);
}
