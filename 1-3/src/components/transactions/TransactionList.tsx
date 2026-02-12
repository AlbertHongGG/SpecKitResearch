'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert } from '@/components/ui/Alert';
import { formatAmount } from '@/lib/shared/money';
import { groupTransactionsByDate } from '@/lib/shared/transactionGrouping';
import { useCategories } from '@/lib/shared/hooks/useCategories';
import { useTransactions } from '@/lib/shared/hooks/useTransactions';
import { useDeleteTransaction } from '@/lib/shared/hooks/useDeleteTransaction';
import { useUpdateTransaction } from '@/lib/shared/hooks/useUpdateTransaction';
import { DailyGroupHeader } from '@/components/transactions/DailyGroupHeader';
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog';
import { EditTransactionDialog, type EditableTransaction } from '@/components/transactions/EditTransactionDialog';

export function TransactionList({ page, pageSize }: { page: number; pageSize: number }) {
  const { data: categories } = useCategories();
  const catName = useMemo(() => new Map((categories ?? []).map((c) => [c.id, c.name])), [categories]);

  const { data, isLoading, error } = useTransactions({ page, pageSize });
  const del = useDeleteTransaction();
  const update = useUpdateTransaction();

  const [editTx, setEditTx] = useState<EditableTransaction | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!data) return [];
    return groupTransactionsByDate({ items: data.items, dailySummaries: data.dailySummaries });
  }, [data]);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) return <Alert className="border-red-200 bg-red-50 text-red-700">{(error as any).message ?? '載入失敗'}</Alert>;
  if (!data || data.items.length === 0) return <Alert>目前沒有帳務資料。</Alert>;

  async function confirmDelete() {
    if (!deleteId) return;
    await del.mutateAsync(deleteId);
    setDeleteId(null);
  }

  return (
    <div className="space-y-6">
      <EditTransactionDialog
        open={!!editTx}
        transaction={editTx}
        categories={categories ?? []}
        saving={update.isPending}
        onClose={() => setEditTx(null)}
        onSave={async (patch) => {
          if (!editTx) return;
          await update.mutateAsync({ id: editTx.id, patch });
          setEditTx(null);
        }}
      />

      <DeleteTransactionDialog
        open={!!deleteId}
        deleting={del.isPending}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
      />

      {groups.map((g) => (
        <section key={g.date} className="rounded-md border border-neutral-200">
          <DailyGroupHeader date={g.date} incomeTotal={g.incomeTotal} expenseTotal={g.expenseTotal} />

          <ul className="divide-y divide-neutral-200">
            {g.items.map((t) => (
              <li key={t.id} className="px-3 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm">
                      <span className={t.type === 'expense' ? 'text-red-600' : 'text-emerald-600'}>
                        {t.type === 'expense' ? '支出' : '收入'}
                      </span>{' '}
                      <span className="font-medium">{formatAmount(t.amount)}</span>
                      <span className="ml-2 text-neutral-600">{catName.get(t.categoryId) ?? t.categoryId}</span>
                    </div>
                    {t.note ? <div className="text-xs text-neutral-600">{t.note}</div> : null}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setEditTx({
                          id: t.id,
                          type: t.type,
                          amount: t.amount,
                          categoryId: t.categoryId,
                          date: t.date,
                          note: t.note,
                        })
                      }
                    >
                      編輯
                    </Button>
                    <Button variant="danger" onClick={() => setDeleteId(t.id)}>
                      刪除
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
