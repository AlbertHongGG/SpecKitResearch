'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { createRefundRequest } from '@/services/refunds/api';
import { ordersApi } from '@/services/orders/api';

export default function SubOrderDetailPage() {
  const params = useParams<{ orderId: string; subOrderId: string }>();
  const { orderId, subOrderId } = params;
  const { data } = useQuery({
    queryKey: ['sub-order', orderId, subOrderId],
    queryFn: () => ordersApi.subOrder(orderId, subOrderId),
  });

  const subOrder = data as { id?: string; status?: string } | undefined;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">SubOrder {subOrder?.id}</h1>
      <p>Status: {subOrder?.status}</p>
      <button
        className="rounded bg-black px-4 py-2 text-white"
        onClick={() => ordersApi.cancel(orderId)}
      >
        Cancel Before Payment
      </button>
      <button
        className="ml-2 rounded border px-4 py-2"
        onClick={() =>
          createRefundRequest({
            subOrderId,
            reason: 'Request refund',
            requestedCents: 100,
          })
        }
      >
        Request Refund
      </button>
    </main>
  );
}
