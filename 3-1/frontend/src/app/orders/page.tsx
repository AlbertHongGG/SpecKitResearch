'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../services/apiClient';
import { LoadingState } from '../../components/states/LoadingState';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

type Order = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export default function OrdersPage() {
  const orders = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiFetch<{ items: Order[] }>('/api/orders'),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">我的訂單</h1>

      {orders.isLoading ? <LoadingState /> : null}
      {orders.isError ? (
        <ErrorState message={(orders.error as ApiError).message} onRetry={() => orders.refetch()} />
      ) : null}

      {orders.data && orders.data.items.length === 0 ? <EmptyState title="目前沒有訂單" /> : null}

      <div className="mt-4 space-y-3">
        {orders.data?.items.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block rounded border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <div className="flex justify-between">
              <div className="font-semibold">{o.id}</div>
              <div className="text-sm">{o.status}</div>
            </div>
            <div className="mt-1 text-sm text-neutral-700">合計：NT$ {Math.round(o.totalAmount / 100)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
