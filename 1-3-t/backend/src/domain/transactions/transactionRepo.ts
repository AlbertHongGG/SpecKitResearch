import type { TransactionType } from '../types';

export type TransactionRecord = {
  id: string;
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  date: Date;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  categoryName: string;
};

export type CreateTransactionInput = {
  userId: string;
  categoryId: string;
  type: TransactionType;
  amount: number;
  date: Date;
  note: string | null;
};

export interface TransactionRepo {
  create(input: CreateTransactionInput): Promise<TransactionRecord>;

  findById(args: { transactionId: string }): Promise<{ id: string; userId: string } | null>;

  listByUser(args: {
    userId: string;
    page: number;
    pageSize: number;
    fromDate?: Date;
    toDate?: Date;
  }): Promise<{ items: TransactionRecord[]; total: number }>;

  update(args: {
    transactionId: string;
    userId: string;
    categoryId: string;
    type: TransactionType;
    amount: number;
    date: Date;
    note?: string | null;
  }): Promise<TransactionRecord | null>;

  delete(args: { transactionId: string }): Promise<void>;
}
