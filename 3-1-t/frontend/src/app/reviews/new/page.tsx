'use client';

import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { createReview } from '@/services/reviews/api';

type FormValues = { productId: string; rating: number; comment: string };

export default function NewReviewPage() {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Create Review</h1>
      <form className="space-y-3" onSubmit={handleSubmit((values) => createReview(values))}>
        <Input label="Product ID" {...register('productId', { required: true })} />
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
    </main>
  );
}
