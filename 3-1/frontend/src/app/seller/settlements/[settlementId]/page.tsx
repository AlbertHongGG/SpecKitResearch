'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../../services/apiClient';
import { LoadingState } from '../../../../components/states/LoadingState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { RoleGate } from '../../../../components/RoleGate';
import { SellerNav } from '../../../../components/SellerNav';

type Settlement = {
  id: string;
  period: string;
  status: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  createdAt: string;
};

export default function SellerSettlementDetailPage() {
  const params = useParams<{ settlementId: string }>();
  const settlementId = params.settlementId;

  const settlement = useQuery({
    queryKey: ['seller-settlement', settlementId],
    queryFn: () => apiFetch<{ settlement: Settlement }>(`/api/seller/settlements/${settlementId}`),
  });

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">結算詳情</h1>
          <Link href="/seller/settlements" className="text-sm underline">
            返回列表
          </Link>
        </div>

        <SellerNav />

        {settlement.isLoading ? <LoadingState /> : null}
        {settlement.isError ? (
          <ErrorState message={(settlement.error as unknown as ApiError).message} onRetry={() => settlement.refetch()} />
        ) : null}

        {settlement.data ? (
          <div className="rounded border border-neutral-200 bg-white p-4 text-sm">
            <div className="font-medium">Period：{settlement.data.settlement.period}</div>
            <div className="mt-1 text-neutral-700">狀態：{settlement.data.settlement.status}</div>

            <div className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <div className="text-neutral-600">Gross</div>
                <div className="font-medium">NT$ {Math.round(settlement.data.settlement.grossAmount / 100)}</div>
              </div>
              <div>
                <div className="text-neutral-600">Fee</div>
                <div className="font-medium">NT$ {Math.round(settlement.data.settlement.platformFee / 100)}</div>
              </div>
              <div>
                <div className="text-neutral-600">Net</div>
                <div className="font-medium">NT$ {Math.round(settlement.data.settlement.netAmount / 100)}</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </RoleGate>
  );
}
