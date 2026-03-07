'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { sellerProductsApi } from '@/services/seller/products/api';

type FormValues = { name: string; description: string; priceCents: number; stock: number };

export default function NewSellerProductPage() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Create Product</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await sellerProductsApi.create(values);
          router.push('/seller/products');
        })}
      >
        <Input label="Name" {...register('name', { required: true })} />
        <Input label="Description" {...register('description', { required: true })} />
        <Input
          label="Price Cents"
          type="number"
          {...register('priceCents', { required: true, valueAsNumber: true })}
        />
        <Input
          label="Stock"
          type="number"
          {...register('stock', { required: true, valueAsNumber: true })}
        />
        <Button type="submit" loading={isSubmitting}>
          Create
        </Button>
      </form>
    </main>
  );
}
