import { prisma } from './prisma';
import type {
  CreateTransactionInput,
  TransactionRecord,
  TransactionRepo,
} from '../../domain/transactions/transactionRepo';
import { TransactionTypeValues, type TransactionType } from '../../domain/types';

function asTransactionType(value: string): TransactionType {
  if ((TransactionTypeValues as readonly string[]).includes(value)) return value as TransactionType;
  throw new Error(`Invalid transaction type in DB: ${value}`);
}

export const transactionRepoPrisma: TransactionRepo = {
  async findById(args) {
    return prisma.transaction.findUnique({
      where: { id: args.transactionId },
      select: { id: true, userId: true },
    });
  },

  async create(input: CreateTransactionInput): Promise<TransactionRecord> {
    const created = await prisma.transaction.create({
      data: {
        userId: input.userId,
        categoryId: input.categoryId,
        type: input.type,
        amount: input.amount,
        date: input.date,
        note: input.note,
      },
      select: {
        id: true,
        userId: true,
        categoryId: true,
        type: true,
        amount: true,
        date: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      id: created.id,
      userId: created.userId,
      categoryId: created.categoryId,
      type: asTransactionType(created.type),
      amount: created.amount,
      date: created.date,
      note: created.note,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
      categoryName: created.category.name,
    };
  },

  async listByUser(args) {
    const where = {
      userId: args.userId,
      ...(args.fromDate || args.toDate
        ? {
            date: {
              ...(args.fromDate ? { gte: args.fromDate } : {}),
              ...(args.toDate ? { lte: args.toDate } : {}),
            },
          }
        : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.transaction.count({ where }),
      prisma.transaction.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        skip: (args.page - 1) * args.pageSize,
        take: args.pageSize,
        select: {
          id: true,
          userId: true,
          categoryId: true,
          type: true,
          amount: true,
          date: true,
          note: true,
          createdAt: true,
          updatedAt: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    const items: TransactionRecord[] = rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      categoryId: r.categoryId,
      type: asTransactionType(r.type),
      amount: r.amount,
      date: r.date,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      categoryName: r.category.name,
    }));

    return { items, total };
  },

  async update(args) {
    const updated = await prisma.transaction.update({
      where: { id: args.transactionId },
      data: {
        userId: args.userId,
        categoryId: args.categoryId,
        type: args.type,
        amount: args.amount,
        date: args.date,
        ...(args.note === undefined ? {} : { note: args.note }),
      },
      select: {
        id: true,
        userId: true,
        categoryId: true,
        type: true,
        amount: true,
        date: true,
        note: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            name: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      userId: updated.userId,
      categoryId: updated.categoryId,
      type: asTransactionType(updated.type),
      amount: updated.amount,
      date: updated.date,
      note: updated.note,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      categoryName: updated.category.name,
    };
  },

  async delete(args) {
    await prisma.transaction.delete({
      where: { id: args.transactionId },
    });
  },
};
