import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AsyncState } from '../components/AsyncState';
import { listCategories } from '../services/categories';
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  type Transaction,
  updateTransaction,
} from '../services/transactions';
import { TransactionCreateDialog } from '../components/transactions/TransactionCreateDialog';
import { TransactionGroupList } from '../components/transactions/TransactionGroupList';
import { toUserFacingMessage } from '../services/apiErrors';
import { TransactionEditDialog } from '../components/transactions/TransactionEditDialog';
import { TransactionDeleteConfirmDialog } from '../components/transactions/TransactionDeleteConfirmDialog';

export function TransactionsPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ['transactions', { page: 1, pageSize: 30 }],
    queryFn: () => listTransactions({ page: 1, pageSize: 30 }),
  });

  const categoriesQuery = useQuery({
    queryKey: ['categories', { includeInactive: true }],
    queryFn: () => listCategories({ includeInactive: true }),
  });

  const createMutation = useMutation({
    mutationFn: createTransaction,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateTransaction,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });

  const errorMessage = useMemo(() => {
    if (transactionsQuery.error) return toUserFacingMessage(transactionsQuery.error);
    if (categoriesQuery.error) return toUserFacingMessage(categoriesQuery.error);
    return null;
  }, [transactionsQuery.error, categoriesQuery.error]);

  const isLoading = transactionsQuery.isLoading || categoriesQuery.isLoading;
  const items = transactionsQuery.data?.items ?? [];
  const isEmpty = !isLoading && !errorMessage && (transactionsQuery.data?.total ?? 0) === 0;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">帳務</h1>
        <button
          type="button"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => setCreateOpen(true)}
        >
          新增帳務
        </button>
      </header>

      <div className="rounded border bg-white">
        <AsyncState
          isLoading={isLoading}
          error={errorMessage}
          onRetry={() => {
            transactionsQuery.refetch();
            categoriesQuery.refetch();
          }}
          isEmpty={isEmpty}
          empty={
            <div className="space-y-2">
              <p>目前沒有帳務。</p>
              <p>先新增第一筆開始記錄吧。</p>
            </div>
          }
        >
          <div className="p-4">
            <TransactionGroupList
              items={items}
              onEdit={(tx) => setEditing(tx)}
              onDelete={(tx) => setDeleting(tx)}
            />
          </div>
        </AsyncState>
      </div>

      <TransactionCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        categories={categoriesQuery.data?.items ?? []}
        submitting={createMutation.isPending}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
      />

      <TransactionEditDialog
        open={!!editing}
        transaction={editing}
        onClose={() => setEditing(null)}
        categories={categoriesQuery.data?.items ?? []}
        submitting={updateMutation.isPending}
        onSubmit={async (args) => {
          await updateMutation.mutateAsync(args);
        }}
      />

      <TransactionDeleteConfirmDialog
        open={!!deleting}
        transaction={deleting}
        onClose={() => setDeleting(null)}
        submitting={deleteMutation.isPending}
        onConfirm={async (args) => {
          await deleteMutation.mutateAsync(args);
        }}
      />
    </section>
  );
}
