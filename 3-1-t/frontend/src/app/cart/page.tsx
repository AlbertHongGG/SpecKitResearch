'use client';

import { useQuery } from '@tanstack/react-query';

import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { cartApi } from '@/services/cart/api';

export default function CartPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['cart'], queryFn: cartApi.get });

  if (isLoading) return <main className="mx-auto max-w-4xl px-6 py-10">Loading...</main>;
  if (isError)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState />
      </main>
    );

  const items =
    (data as { items?: Array<{ id: string; quantity: number; product: { name: string } }> })
      ?.items ?? [];
  if (items.length === 0)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Empty title="Cart is empty" />
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Cart</h1>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded border p-3">
            {item.product.name} × {item.quantity}
          </li>
        ))}
      </ul>
    </main>
  );
}
