'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { ordersApi } from '@/services/orders/api';

export default function OrdersPage() {
  const { data } = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const orders = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">My Orders</h1>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className="rounded border p-3">
            <Link href={`/orders/${order.id}`}>{order.id}</Link> · {order.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
