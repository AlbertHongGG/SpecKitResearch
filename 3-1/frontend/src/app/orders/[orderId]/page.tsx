'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { Button } from '../../../components/ui/Button';

type SubOrder = {
  id: string;
  sellerId: string;
  subtotal: number;
  status: string;
};

type OrderDetail = {
  id: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  subOrders: SubOrder[];
};

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const order = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<{ order: OrderDetail }>(`/api/orders/${orderId}`),
  });

  const detail = order.data?.order;
  const canCancel = detail?.status === 'pending_payment';

  async function cancelOrder() {
    if (!confirm('確定要取消此訂單？（僅未付款可取消）')) return;
    await apiFetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    await order.refetch();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">訂單詳情</h1>
        <Link className="text-sm underline" href="/orders">
          回訂單列表
        </Link>
      </div>

      {order.isLoading ? <LoadingState /> : null}
      {order.isError ? (
        <ErrorState message={(order.error as unknown as ApiError).message} onRetry={() => order.refetch()} />
      ) : null}

      {order.data ? (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4">
          <div className="text-sm">訂單：{detail!.id}</div>
          <div className="mt-1 text-sm">狀態：{detail!.status}</div>
          <div className="mt-1 text-sm">合計：NT$ {Math.round(detail!.totalAmount / 100)}</div>

          <div className="mt-3">
            <Button variant="danger" onClick={cancelOrder} disabled={!canCancel}>
              {canCancel ? '取消訂單' : '目前不可取消'}
            </Button>
          </div>

          <div className="mt-4">
            <div className="font-semibold">子訂單</div>
            <div className="mt-2 space-y-2">
              {detail!.subOrders.map((s) => (
                <Link
                  key={s.id}
                  href={`/orders/${detail!.id}/suborders/${s.id}`}
                  className="block rounded border border-neutral-200 p-3 hover:border-neutral-300"
                >
                  <div className="flex justify-between">
                    <div className="text-sm">{s.id}</div>
                    <div className="text-sm">{s.status}</div>
                  </div>
                  <div className="mt-1 text-sm text-neutral-700">
                    小計：NT$ {Math.round(s.subtotal / 100)}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
