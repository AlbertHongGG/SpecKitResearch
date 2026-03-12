'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { cartApi } from '@/services/cart/api';
import { useSession } from '@/services/auth/useSession';

type Props = {
  productId: string;
  disabled?: boolean;
};

export function AddToCartButton({ productId, disabled = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, isLoading } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        disabled={disabled || isLoading}
        loading={isSubmitting}
        onClick={async () => {
          if (!data?.user) {
            router.push(`/login?returnTo=${encodeURIComponent(`/products/${productId}`)}`);
            return;
          }

          setIsSubmitting(true);
          setMessage(null);

          try {
            await cartApi.addItem({ productId, quantity: 1 });
            await queryClient.invalidateQueries({ queryKey: ['cart'] });
            setMessage('Added to cart.');
          } catch {
            setMessage('Could not add this item to cart.');
          } finally {
            setIsSubmitting(false);
          }
        }}
      >
        Add to cart
      </Button>
      {message ? <p className="text-sm text-black/70">{message}</p> : null}
    </div>
  );
}
