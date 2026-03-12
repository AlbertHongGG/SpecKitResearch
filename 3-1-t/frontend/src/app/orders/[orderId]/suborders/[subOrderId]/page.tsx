'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { createRefundRequest } from '@/services/refunds/api';
import { useSession } from '@/services/auth/useSession';
import { ordersApi } from '@/services/orders/api';

export default function SubOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string; subOrderId: string }>();
  const { orderId, subOrderId } = params;
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data, refetch } = useQuery({
    queryKey: ['sub-order', orderId, subOrderId],
    queryFn: () => ordersApi.subOrder(orderId, subOrderId),
    enabled: !!session?.user,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [reason, setReason] = useState('Request refund');
  const [requestedCents, setRequestedCents] = useState('');

  const subOrder = data as
    | {
        id?: string;
        status?: string;
        subtotalCents?: number;
        items?: Array<{ productId: string; unitPriceCents?: number; quantity?: number }>;
      }
    | undefined;
  const canCancel = subOrder?.status === 'PENDING_PAYMENT';
  const canConfirmDelivery = subOrder?.status === 'SHIPPED';
  const canRefund = subOrder?.status === 'DELIVERED';
  const reviewProductId = subOrder?.items?.[0]?.productId;
  const subtotalCents =
    subOrder?.subtotalCents ??
    (subOrder?.items ?? []).reduce(
      (sum, item) => sum + (item.unitPriceCents ?? 0) * (item.quantity ?? 0),
      0,
    );

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.replace(
        `/login?returnTo=${encodeURIComponent(`/orders/${orderId}/suborders/${subOrderId}`)}`,
      );
    }
  }, [orderId, router, session?.user, sessionLoading, subOrderId]);

  useEffect(() => {
    if (!requestedCents && subtotalCents) {
      setRequestedCents(String(subtotalCents));
    }
  }, [requestedCents, subtotalCents]);

  if (sessionLoading || !session?.user) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Redirecting to login...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">SubOrder {subOrder?.id}</h1>
      <p>Status: {subOrder?.status}</p>
      {subtotalCents ? <p>Subtotal: ${(subtotalCents / 100).toFixed(2)}</p> : null}
      <ul className="space-y-2">
        {(subOrder?.items ?? []).map((item) => (
          <li key={item.productId} className="rounded border p-3 text-sm">
            Product: {item.productId} · Qty {item.quantity ?? 0} · $
            {(item.unitPriceCents ?? 0) / 100}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            onClick={async () => {
              await ordersApi.cancel(orderId);
              setMessage('Order cancelled.');
              await refetch();
            }}
          >
            Cancel Before Payment
          </Button>
        ) : null}
        {canConfirmDelivery ? (
          <Button
            onClick={async () => {
              await ordersApi.deliver(orderId, subOrderId);
              setMessage('Delivery confirmed.');
              await refetch();
            }}
          >
            Confirm Received
          </Button>
        ) : null}
        {subOrder?.status === 'DELIVERED' && reviewProductId ? (
          <Link
            className="rounded border px-4 py-2"
            href={`/reviews/new?productId=${reviewProductId}`}
          >
            Write Review
          </Link>
        ) : null}
      </div>
      {canRefund ? (
        <form
          className="grid gap-3 rounded border p-4 md:grid-cols-3"
          onSubmit={async (event) => {
            event.preventDefault();
            await createRefundRequest({
              subOrderId,
              reason,
              requestedCents: Number(requestedCents),
            });
            setMessage('Refund requested.');
            await refetch();
          }}
        >
          <Input
            label="Refund Reason"
            onChange={(event) => setReason(event.target.value)}
            value={reason}
          />
          <Input
            label="Requested Amount (cents)"
            onChange={(event) => setRequestedCents(event.target.value)}
            type="number"
            value={requestedCents}
          />
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              Request Refund
            </Button>
          </div>
        </form>
      ) : null}
      {message ? <p className="text-sm text-black/70">{message}</p> : null}
    </main>
  );
}
