'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { sellerOrdersApi } from '@/services/seller/orders/api';

export default function SellerOrdersPage() {
  const guard = useRolePageGuard('SELLER');
  const { data } = useQuery({ queryKey: ['seller-orders'], queryFn: sellerOrdersApi.list });
  const orders = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Orders</h1>
      <ul className="space-y-2">
        {orders.map((order) => (
          <li key={order.id} className="rounded border p-3">
            <Link href={`/seller/orders/${order.id}`}>{order.id}</Link> · {order.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
