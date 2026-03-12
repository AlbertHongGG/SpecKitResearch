'use client';

import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { Select } from '@/components/ui/form/Select';
import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { sellerProductsApi } from '@/services/seller/products/api';

type FormValues = {
  name?: string;
  description?: string;
  priceCents?: number;
  stock?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'INACTIVE';
};

export default function EditSellerProductPage() {
  const guard = useRolePageGuard('SELLER');
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  if (!guard.allowed) {
    return <main className="mx-auto max-w-md px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-md space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Edit Product {params.productId}</h1>
      <form
        className="space-y-3"
        onSubmit={handleSubmit(async (values) => {
          await sellerProductsApi.update(params.productId, values);
          router.push('/seller/products');
        })}
      >
        <Input label="Name" {...register('name')} />
        <Input label="Description" {...register('description')} />
        <Input
          label="Price Cents"
          type="number"
          {...register('priceCents', { valueAsNumber: true })}
        />
        <Input label="Stock" type="number" {...register('stock', { valueAsNumber: true })} />
        <Select label="Status" {...register('status')}>
          <option value="">Keep current status</option>
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>
        <Button type="submit" loading={isSubmitting}>
          Save
        </Button>
      </form>
    </main>
  );
}
