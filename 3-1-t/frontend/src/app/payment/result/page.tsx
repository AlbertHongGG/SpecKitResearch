'use client';

import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { paymentsApi } from '@/services/payments/api';

export default function PaymentResultPage() {
  const params = useSearchParams();
  const paymentId = params.get('paymentId') ?? '';
  const { data, refetch } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentsApi.get(paymentId),
    enabled: !!paymentId,
  });

  const payment = data as { status?: string } | undefined;

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Payment Result</h1>
      <p>Status: {payment?.status ?? 'Unknown'}</p>
      <div className="flex gap-3">
        <Button
          onClick={async () => {
            if (paymentId) {
              await paymentsApi.retry(paymentId);
              await refetch();
            }
          }}
        >
          Retry
        </Button>
      </div>
    </main>
  );
}
