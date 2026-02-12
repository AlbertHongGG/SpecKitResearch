'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/ui/Button';
import { RoleGate } from '../../../components/RoleGate';
import { SellerNav } from '../../../components/SellerNav';

type RefundRequest = {
  id: string;
  subOrderId: string;
  status: string;
  reason: string;
  requestedAmount: number;
  createdAt: string;
};

export default function SellerRefundsPage() {
  const refunds = useQuery({
    queryKey: ['seller-refunds'],
    queryFn: () => apiFetch<{ items: RefundRequest[] }>('/api/seller/refunds'),
  });

  async function approve(refundId: string) {
    await apiFetch(`/api/seller/refunds/${refundId}/approve`, { method: 'POST' });
    await refunds.refetch();
  }

  async function reject(refundId: string) {
    await apiFetch(`/api/seller/refunds/${refundId}/reject`, { method: 'POST' });
    await refunds.refetch();
  }

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">退款申請</h1>
        <SellerNav />

        {refunds.isLoading ? <LoadingState /> : null}
        {refunds.isError ? (
          <ErrorState message={(refunds.error as unknown as ApiError).message} onRetry={() => refunds.refetch()} />
        ) : null}
        {refunds.data && refunds.data.items.length === 0 ? <EmptyState title="目前沒有退款申請" /> : null}

        <div className="space-y-3">
          {refunds.data?.items.map((r) => (
            <div key={r.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{r.subOrderId}</div>
                <div className="text-sm text-neutral-700">{r.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">refundId: {r.id}</div>
              <div className="mt-1 text-sm text-neutral-700">原因：{r.reason}</div>
              <div className="mt-1 text-sm text-neutral-700">金額：NT$ {Math.round(r.requestedAmount / 100)}</div>

              <div className="mt-3 flex gap-2">
                <Button onClick={() => approve(r.id)} disabled={r.status !== 'requested'}>
                  同意
                </Button>
                <Button variant="danger" onClick={() => reject(r.id)} disabled={r.status !== 'requested'}>
                  拒絕
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
