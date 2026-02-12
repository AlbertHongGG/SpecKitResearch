'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { RoleGate } from '../../../components/RoleGate';
import { SellerNav } from '../../../components/SellerNav';

type SubOrder = {
  id: string;
  orderId: string;
  status: string;
  totalAmount: number;
  createdAt: string;
};

export default function SellerOrdersPage() {
  const suborders = useQuery({
    queryKey: ['seller-suborders'],
    queryFn: () => apiFetch<{ items: SubOrder[] }>('/api/seller/suborders'),
  });

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">賣家訂單</h1>
        <SellerNav />

        {suborders.isLoading ? <LoadingState /> : null}
        {suborders.isError ? (
          <ErrorState message={(suborders.error as unknown as ApiError).message} onRetry={() => suborders.refetch()} />
        ) : null}

        {suborders.data && suborders.data.items.length === 0 ? <EmptyState title="目前沒有子訂單" /> : null}

        <div className="space-y-3">
          {suborders.data?.items.map((s) => (
            <Link
              key={s.id}
              href={`/seller/orders/${s.id}`}
              className="block rounded border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{s.id}</div>
                <div className="text-sm text-neutral-700">{s.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">金額：NT$ {Math.round(s.totalAmount / 100)}</div>
            </Link>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
