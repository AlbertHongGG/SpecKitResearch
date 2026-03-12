'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { ApiClientError } from '@/services/api/client';
import { useSession } from '@/services/auth/useSession';
import { cartApi } from '@/services/cart/api';

export default function CartPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: !!session?.user,
    retry: false,
  });
  const [pendingItemId, setPendingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.replace('/login?returnTo=%2Fcart');
    }
  }, [router, session?.user, sessionLoading]);

  if (sessionLoading || (!session?.user && !sessionLoading)) {
    return <main className="mx-auto max-w-4xl px-6 py-10">Redirecting to login...</main>;
  }

  if (isLoading) return <main className="mx-auto max-w-4xl px-6 py-10">Loading...</main>;
  if (error instanceof ApiClientError && error.status === 401) {
    router.replace('/login?returnTo=%2Fcart');
    return <main className="mx-auto max-w-4xl px-6 py-10">Redirecting to login...</main>;
  }
  if (isError)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState />
      </main>
    );

  const items =
    (
      data as {
        items?: Array<{
          id: string;
          quantity: number;
          product: { id: string; name: string; priceCents?: number };
        }>;
      }
    )?.items ?? [];
  const totalCents = items.reduce(
    (sum, item) => sum + item.quantity * (item.product.priceCents ?? 0),
    0,
  );

  if (items.length === 0)
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Empty title="Cart is empty" />
        <div className="mt-4">
          <Link className="text-sm underline" href="/">
            Continue shopping
          </Link>
        </div>
      </main>
    );

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Cart</h1>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="rounded border p-3">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-medium">{item.product.name}</div>
                <div className="text-sm text-black/70">
                  ${(item.product.priceCents ?? 0) / 100} each
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded border px-3 py-1"
                  disabled={pendingItemId === item.id || item.quantity <= 1}
                  onClick={async () => {
                    setPendingItemId(item.id);
                    try {
                      await cartApi.updateItem({ itemId: item.id, quantity: item.quantity - 1 });
                      await refetch();
                    } finally {
                      setPendingItemId(null);
                    }
                  }}
                >
                  -
                </button>
                <span className="min-w-8 text-center">{item.quantity}</span>
                <button
                  className="rounded border px-3 py-1"
                  disabled={pendingItemId === item.id}
                  onClick={async () => {
                    setPendingItemId(item.id);
                    try {
                      await cartApi.updateItem({ itemId: item.id, quantity: item.quantity + 1 });
                      await refetch();
                    } finally {
                      setPendingItemId(null);
                    }
                  }}
                >
                  +
                </button>
                <button
                  className="rounded border border-red-300 px-3 py-1 text-red-700"
                  disabled={pendingItemId === item.id}
                  onClick={async () => {
                    setPendingItemId(item.id);
                    try {
                      await cartApi.removeItem({ itemId: item.id });
                      await refetch();
                    } finally {
                      setPendingItemId(null);
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between rounded border p-4">
        <div>
          <div className="text-sm text-black/70">Estimated total</div>
          <div className="text-xl font-semibold">${(totalCents / 100).toFixed(2)}</div>
        </div>
        <Link
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
          href="/checkout"
        >
          Proceed to checkout
        </Link>
      </div>
    </main>
  );
}
