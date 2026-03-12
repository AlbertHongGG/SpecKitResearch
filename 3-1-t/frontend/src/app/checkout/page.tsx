'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { ApiClientError } from '@/services/api/client';
import { useSession } from '@/services/auth/useSession';
import { cartApi } from '@/services/cart/api';
import { createCheckout } from '@/services/checkout/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data, isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: cartApi.get,
    enabled: !!session?.user,
    retry: false,
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [invalidItems, setInvalidItems] = useState<
    Array<{ productId: string; availableStock: number }>
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.replace('/login?returnTo=%2Fcheckout');
    }
  }, [router, session?.user, sessionLoading]);

  if (sessionLoading || (!session?.user && !sessionLoading)) {
    return <main className="mx-auto max-w-4xl px-6 py-10">Redirecting to login...</main>;
  }

  const items =
    (
      data as {
        items?: Array<{
          id: string;
          quantity: number;
          product: { name: string; priceCents?: number };
        }>;
      }
    )?.items ?? [];
  const totalCents = items.reduce(
    (sum, item) => sum + item.quantity * (item.product.priceCents ?? 0),
    0,
  );

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      {isLoading ? <p>Loading cart...</p> : null}
      {!isLoading && items.length > 0 ? (
        <ul className="space-y-2 rounded border p-4">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <span>
                {item.product.name} × {item.quantity}
              </span>
              <span>${(((item.product.priceCents ?? 0) * item.quantity) / 100).toFixed(2)}</span>
            </li>
          ))}
          <li className="border-t pt-3 font-semibold">Total: ${(totalCents / 100).toFixed(2)}</li>
        </ul>
      ) : null}
      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
      {invalidItems.length > 0 ? (
        <ul className="space-y-1 rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {invalidItems.map((item) => (
            <li key={item.productId}>
              Product {item.productId} only has {item.availableStock} left.
            </li>
          ))}
        </ul>
      ) : null}
      <Button
        loading={isSubmitting}
        disabled={items.length === 0}
        onClick={async () => {
          setIsSubmitting(true);
          setErrorMessage(null);
          setInvalidItems([]);

          try {
            const result = (await createCheckout()) as { payment?: { id?: string } };
            router.push(`/payment/result?paymentId=${result.payment?.id ?? ''}`);
          } catch (error) {
            if (error instanceof ApiClientError && error.status === 409) {
              const details = (error.details ?? {}) as {
                invalidItems?: Array<{ productId: string; availableStock: number }>;
              };
              setErrorMessage(error.message);
              setInvalidItems(details.invalidItems ?? []);
            } else if (error instanceof ApiClientError && error.status === 401) {
              router.replace('/login?returnTo=%2Fcheckout');
            } else {
              setErrorMessage('Checkout failed. Please try again.');
            }
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        Place order
      </Button>
    </main>
  );
}
