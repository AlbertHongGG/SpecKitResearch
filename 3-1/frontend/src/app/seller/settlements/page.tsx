'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { RoleGate } from '../../../components/RoleGate';
import { SellerNav } from '../../../components/SellerNav';

type Settlement = {
  id: string;
  period: string;
  status: string;
  grossAmount: number;
  netAmount: number;
  createdAt: string;
};

export default function SellerSettlementsPage() {
  const settlements = useQuery({
    queryKey: ['seller-settlements'],
    queryFn: () => apiFetch<{ items: Settlement[] }>('/api/seller/settlements'),
  });

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">結算</h1>
        <SellerNav />

        {settlements.isLoading ? <LoadingState /> : null}
        {settlements.isError ? (
          <ErrorState message={(settlements.error as unknown as ApiError).message} onRetry={() => settlements.refetch()} />
        ) : null}

        {settlements.data && settlements.data.items.length === 0 ? <EmptyState title="目前沒有結算資料" /> : null}

        <div className="space-y-3">
          {settlements.data?.items.map((s) => (
            <Link
              key={s.id}
              href={`/seller/settlements/${s.id}`}
              className="block rounded border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{s.period}</div>
                <div className="text-sm text-neutral-700">{s.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                Gross：NT$ {Math.round(s.grossAmount / 100)} · Net：NT$ {Math.round(s.netAmount / 100)}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
