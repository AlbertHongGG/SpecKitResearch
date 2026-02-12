import { httpJson } from './http';

export type TransactionType = 'income' | 'expense';

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  categoryId: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  note: string | null;
};

export type PagedTransactions = {
  items: Transaction[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listTransactions(args?: {
  page?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
}): Promise<PagedTransactions> {
  return httpJson<PagedTransactions>({
    path: '/transactions',
    query: {
      page: args?.page,
      pageSize: args?.pageSize,
      fromDate: args?.fromDate,
      toDate: args?.toDate,
    },
  });
}

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  categoryId: string;
  date: string; // YYYY-MM-DD
  note?: string;
}): Promise<Transaction> {
  return httpJson<Transaction>({
    method: 'POST',
    path: '/transactions',
    body: input,
  });
}

export async function updateTransaction(args: {
  transactionId: string;
  input: {
    type: TransactionType;
    amount: number;
    categoryId: string;
    date: string; // YYYY-MM-DD
    note?: string;
  };
}): Promise<Transaction> {
  return httpJson<Transaction>({
    method: 'PUT',
    path: `/transactions/${args.transactionId}`,
    body: args.input,
  });
}

export async function deleteTransaction(args: { transactionId: string }): Promise<{ ok: boolean }> {
  return httpJson<{ ok: boolean }>({
    method: 'DELETE',
    path: `/transactions/${args.transactionId}`,
  });
}
