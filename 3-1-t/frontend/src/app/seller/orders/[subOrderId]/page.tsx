'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { sellerOrdersApi } from '@/services/seller/orders/api';
import { sellerRefundsApi } from '@/services/seller/refunds/api';

export default function SellerOrderDetailPage() {
  const guard = useRolePageGuard('SELLER');
  const params = useParams<{ subOrderId: string }>();
  const subOrderId = params.subOrderId;

  const { data, refetch } = useQuery({
    queryKey: ['seller-order', subOrderId],
    queryFn: () => sellerOrdersApi.detail(subOrderId),
  });

  const order = data as { id?: string; status?: string } | undefined;

  if (!guard.allowed) {
    return <main className="mx-auto max-w-4xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller SubOrder {order?.id}</h1>
      <p>Status: {order?.status}</p>
      <div className="flex gap-2">
        <button
          className="rounded bg-black px-4 py-2 text-white"
          onClick={async () => {
            await sellerOrdersApi.ship(subOrderId);
            await refetch();
          }}
        >
          Ship
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => sellerRefundsApi.approve(subOrderId)}
        >
          Approve Refund
        </button>
        <button
          className="rounded border px-4 py-2"
          onClick={() => sellerRefundsApi.reject(subOrderId)}
        >
          Reject Refund
        </button>
      </div>
    </main>
  );
}
