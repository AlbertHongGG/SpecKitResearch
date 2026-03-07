'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { ordersApi } from '@/services/orders/api';

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const { data } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.detail(orderId),
  });
  const order = data as
    | { id?: string; subOrders?: Array<{ id: string; status: string }> }
    | undefined;

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Order {order?.id}</h1>
      <ul className="space-y-2">
        {(order?.subOrders ?? []).map((subOrder) => (
          <li key={subOrder.id} className="rounded border p-3">
            <Link href={`/orders/${orderId}/suborders/${subOrder.id}`}>{subOrder.id}</Link> ·{' '}
            {subOrder.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
