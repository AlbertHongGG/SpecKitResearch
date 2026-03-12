'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Input } from '@/components/ui/form/Input';
import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { adminOrdersApi } from '@/services/admin/orders/api';

export default function AdminOrdersPage() {
  const guard = useRolePageGuard('ADMIN');
  const [buyerId, setBuyerId] = useState('');
  const { data, refetch } = useQuery({
    queryKey: ['admin-orders', buyerId],
    queryFn: () => adminOrdersApi.list(buyerId || undefined),
  });
  const orders =
    (data as
      | Array<{
          id: string;
          buyerId?: string;
          status: string;
          subOrders?: Array<{ id: string; status: string }>;
          payments?: Array<{ id: string; status: string }>;
        }>
      | undefined) ?? [];

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Orders</h1>
      <form
        className="max-w-sm"
        onSubmit={async (event) => {
          event.preventDefault();
          await refetch();
        }}
      >
        <Input
          label="Filter by Buyer ID"
          onChange={(event) => setBuyerId(event.target.value)}
          value={buyerId}
        />
      </form>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className="rounded border p-3">
            <div className="space-y-1 text-sm">
              <div className="font-medium">
                <Link className="underline" href={`/admin/orders`}>
                  {order.id}
                </Link>{' '}
                · {order.status}
              </div>
              <div>Buyer: {order.buyerId ?? 'Unknown'}</div>
              <div>
                Payments:{' '}
                {(order.payments ?? [])
                  .map((payment) => `${payment.id}:${payment.status}`)
                  .join(', ') || 'None'}
              </div>
              <div>
                SubOrders:{' '}
                {(order.subOrders ?? [])
                  .map((subOrder) => `${subOrder.id}:${subOrder.status}`)
                  .join(', ') || 'None'}
              </div>
            </div>
            <div className="mt-2 flex gap-2">
              <button
                className="rounded bg-black px-3 py-1 text-white"
                onClick={async () => {
                  await adminOrdersApi.forceCancel(order.id);
                  await refetch();
                }}
              >
                Force Cancel
              </button>
              <button
                className="rounded border px-3 py-1"
                onClick={async () => {
                  await adminOrdersApi.forceRefund(order.id);
                  await refetch();
                }}
              >
                Force Refund
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
