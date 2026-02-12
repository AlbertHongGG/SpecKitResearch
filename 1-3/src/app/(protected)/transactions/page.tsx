'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionList } from '@/components/transactions/TransactionList';

export default function TransactionsPage() {
  const [page, setPage] = useState(1);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h1 className="text-lg font-semibold">新增帳務</h1>
        </CardHeader>
        <CardContent>
          <TransactionForm onCreated={() => setPage(1)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">帳務列表</h2>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-neutral-200 px-3 py-1 text-sm disabled:opacity-50"
                onClick={() => setPage((p: number) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                上一頁
              </button>
              <span className="text-sm text-neutral-600">第 {page} 頁</span>
              <button
                className="rounded-md border border-neutral-200 px-3 py-1 text-sm"
                onClick={() => setPage((p: number) => p + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionList page={page} pageSize={30} />
        </CardContent>
      </Card>
    </div>
  );
}
