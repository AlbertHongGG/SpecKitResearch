'use client';

import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/form/Button';
import { createCheckout } from '@/services/checkout/api';

export default function CheckoutPage() {
  const router = useRouter();

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <Button
        onClick={async () => {
          const result = (await createCheckout()) as { payment?: { id?: string } };
          router.push(`/payment/result?paymentId=${result.payment?.id ?? ''}`);
        }}
      >
        Place order
      </Button>
    </main>
  );
}
