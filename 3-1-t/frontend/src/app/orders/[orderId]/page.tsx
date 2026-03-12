'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { useSession } from '@/services/auth/useSession';
import { ordersApi } from '@/services/orders/api';
import { paymentsApi } from '@/services/payments/api';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data, refetch } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersApi.detail(orderId),
    enabled: !!session?.user,
  });
  const [message, setMessage] = useState<string | null>(null);
  const order = data as
    | {
        id?: string;
        status?: string;
        aggregateStatus?: string;
        payments?: Array<{ id: string; status: string; amountCents: number }>;
        subOrders?: Array<{ id: string; status: string }>;
      }
    | undefined;
  const payment = order?.payments?.[0];
  const isRetryable = payment?.status === 'FAILED' || payment?.status === 'CANCELLED';
  const canCancel = payment?.status === 'PENDING';

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      router.replace(`/login?returnTo=${encodeURIComponent(`/orders/${orderId}`)}`);
    }
  }, [orderId, router, session?.user, sessionLoading]);

  if (sessionLoading || !session?.user) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Redirecting to login...</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Order {order?.id}</h1>
      <div className="rounded border p-4 text-sm">
        <p>Status: {order?.status ?? 'Unknown'}</p>
        <p>Aggregate status: {order?.aggregateStatus ?? order?.status ?? 'Unknown'}</p>
        <p>
          Payment: {payment?.status ?? 'Unknown'}
          {payment ? ` · $${((payment.amountCents ?? 0) / 100).toFixed(2)}` : ''}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canCancel ? (
          <Button
            onClick={async () => {
              await ordersApi.cancel(orderId);
              await refetch();
              setMessage('Order cancelled before payment.');
            }}
          >
            Cancel Before Payment
          </Button>
        ) : null}
        {isRetryable && payment?.id ? (
          <Button
            onClick={async () => {
              await paymentsApi.retry(payment.id);
              router.push(`/payment/result?paymentId=${encodeURIComponent(payment.id)}`);
            }}
          >
            Retry Payment
          </Button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-black/70">{message}</p> : null}
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
