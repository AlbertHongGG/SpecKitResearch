'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../../services/apiClient';
import { resolver } from '../../../../lib/forms';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Alert } from '../../../../components/ui/Alert';
import { RoleGate } from '../../../../components/RoleGate';
import { SellerNav } from '../../../../components/SellerNav';
import { applyApiErrorToForm } from '../../../../services/httpErrorHandling';

const schema = z.object({
  title: z.string().min(1, '請輸入商品名稱'),
  description: z.string().min(1, '請輸入商品描述'),
  price: z.coerce.number().int().min(0, '價格需為整數'),
  stock: z.coerce.number().int().min(0, '庫存需為整數'),
  categoryId: z.string().min(1, '請選擇分類'),
});

type FormValues = z.infer<typeof schema>;

type Category = { id: string; name: string; status: 'active' | 'inactive' };

type CreatedProduct = { id: string };

export default function NewSellerProductPage() {
  const router = useRouter();

  const categories = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => apiFetch<{ items: Category[] }>('/api/catalog/categories'),
  });

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { title: '', description: '', price: 0, stock: 0, categoryId: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      const res = await apiFetch<{ product: CreatedProduct }>('/api/seller/products', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      router.replace(`/seller/products/${res.product.id}/edit`);
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '建立失敗' });
    }
  });

  const activeCategories = (categories.data?.items ?? []).filter((c) => c.status === 'active');

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">新增商品</h1>
        <SellerNav />

        <form className="max-w-xl space-y-3" onSubmit={onSubmit}>
          {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

          <Input
            label="商品名稱"
            aria-label="title"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />

          <Input
            label="商品描述"
            aria-label="description"
            error={form.formState.errors.description?.message}
            {...form.register('description')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="價格（分）"
              aria-label="price"
              inputMode="numeric"
              error={form.formState.errors.price?.message}
              {...form.register('price')}
            />
            <Input
              label="庫存"
              aria-label="stock"
              inputMode="numeric"
              error={form.formState.errors.stock?.message}
              {...form.register('stock')}
            />
          </div>

          <div>
            <label className="text-sm font-medium">分類</label>
            <select
              aria-label="categoryId"
              className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
              {...form.register('categoryId')}
              disabled={categories.isLoading}
            >
              <option value="">請選擇</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.categoryId?.message ? (
              <div className="mt-1 text-sm text-red-700">{form.formState.errors.categoryId.message}</div>
            ) : null}
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '建立中…' : '建立'}
          </Button>
        </form>
      </div>
    </RoleGate>
  );
}
