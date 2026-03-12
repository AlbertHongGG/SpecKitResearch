'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Empty } from '@/components/ui/Empty';
import { ordersApi } from '@/services/orders/api';
import { useSession } from '@/services/auth/useSession';

export default function OrdersPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data } = useQuery({ queryKey: ['orders'], queryFn: ordersApi.list });
  const orders = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.replace('/login?returnTo=%2Forders');
    }
  }, [router, session?.user, sessionLoading]);

  if (sessionLoading || (!session?.user && !sessionLoading)) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Redirecting to login...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">My Orders</h1>
      {orders.length === 0 ? <Empty title="You have no orders yet" /> : null}
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
