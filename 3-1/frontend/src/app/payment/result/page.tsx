'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';

type Result = {
  found: boolean;
  orderId?: string;
  orderStatus?: string;
  paymentStatus?: string;
};

export default function PaymentResultPage() {
  const params = useSearchParams();
  const orderId = params.get('orderId') ?? '';

  const result = useQuery({
    queryKey: ['payment', 'result', orderId],
    enabled: Boolean(orderId),
    queryFn: () => apiFetch<Result>(`/api/payments/result?orderId=${encodeURIComponent(orderId)}`),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-xl font-semibold">付款結果</h1>

      {!orderId ? <div className="mt-4 text-sm">缺少 orderId</div> : null}

      {result.isLoading ? <LoadingState /> : null}
      {result.isError ? (
        <ErrorState message={(result.error as ApiError).message} onRetry={() => result.refetch()} />
      ) : null}

      {result.data ? (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4">
          {result.data.found ? (
            <>
              <div className="text-sm">訂單：{result.data.orderId}</div>
              <div className="mt-2 text-sm">Order 狀態：{result.data.orderStatus}</div>
              <div className="mt-1 text-sm">付款狀態：{result.data.paymentStatus}</div>

              <div className="mt-4 flex gap-3">
                <Link className="underline text-sm" href={`/orders/${encodeURIComponent(result.data.orderId ?? '')}`}>
                  前往訂單詳情
                </Link>
                <Link className="underline text-sm" href="/orders">
                  我的訂單
                </Link>
              </div>
            </>
          ) : (
            <div className="text-sm">找不到訂單</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
