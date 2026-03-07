'use client';

import { useQuery } from '@tanstack/react-query';

import { adminOrdersApi } from '@/services/admin/orders/api';

export default function AdminOrdersPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => adminOrdersApi.list(),
  });
  const orders = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Orders</h1>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className="rounded border p-3">
            {order.id} · {order.status}
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
