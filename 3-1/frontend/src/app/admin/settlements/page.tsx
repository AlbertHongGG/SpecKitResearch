'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/ui/Button';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';

type Settlement = {
  id: string;
  sellerId: string;
  period: string;
  status: string;
  grossAmount: number;
  netAmount: number;
  createdAt: string;
};

export default function AdminSettlementsPage() {
  const settlements = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: () => apiFetch<{ items: Settlement[] }>('/api/admin/settlements'),
  });

  async function markSettled(id: string) {
    await apiFetch(`/api/admin/settlements/${id}/mark-settled`, { method: 'POST' });
    await settlements.refetch();
  }

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">結算管理</h1>
        <AdminNav />

        {settlements.isLoading ? <LoadingState /> : null}
        {settlements.isError ? (
          <ErrorState message={(settlements.error as unknown as ApiError).message} onRetry={() => settlements.refetch()} />
        ) : null}
        {settlements.data && settlements.data.items.length === 0 ? <EmptyState title="目前沒有結算" /> : null}

        <div className="space-y-3">
          {settlements.data?.items.map((s) => (
            <div key={s.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{s.period}</div>
                <div className="text-sm text-neutral-700">{s.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">sellerId: {s.sellerId}</div>
              <div className="mt-1 text-sm text-neutral-700">
                Gross：NT$ {Math.round(s.grossAmount / 100)} · Net：NT$ {Math.round(s.netAmount / 100)}
              </div>

              <div className="mt-3">
                <Button onClick={() => markSettled(s.id)} disabled={s.status === 'settled'}>
                  {s.status === 'settled' ? '已結清' : '標記結清'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
