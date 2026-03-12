'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { useSession } from '@/services/auth/useSession';
import { createReview } from '@/services/reviews/api';

type FormValues = { productId: string; rating: number; comment: string };

export default function NewReviewPage() {
  const router = useRouter();
  const params = useSearchParams();
  const productId = params.get('productId') ?? '';
  const { data: session, isLoading: sessionLoading } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  useEffect(() => {
    if (productId) {
      setValue('productId', productId);
    }
  }, [productId, setValue]);

  useEffect(() => {
    if (!sessionLoading && !session?.user) {
      const returnTo = productId
        ? `/reviews/new?productId=${encodeURIComponent(productId)}`
        : '/reviews/new';
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
  }, [productId, router, session?.user, sessionLoading]);

  if (sessionLoading || !session?.user) {
    return <main className="mx-auto max-w-md px-6 py-10">Redirecting to login...</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Create Review</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await createReview(values);
          setMessage('Review submitted.');
          router.push('/orders');
        })}
      >
        <Input
          label="Product ID"
          readOnly={!!productId}
          {...register('productId', { required: true })}
        />
        <Input
          label="Rating"
          type="number"
          {...register('rating', { required: true, valueAsNumber: true })}
        />
        <Input label="Comment" {...register('comment')} />
        <Button type="submit" loading={isSubmitting}>
          Submit
        </Button>
      </form>
      {message ? <p className="text-sm text-black/70">{message}</p> : null}
    </main>
  );
}
