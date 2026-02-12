'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../../../services/apiClient';
import { resolver } from '../../../../../lib/forms';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Alert } from '../../../../../components/ui/Alert';
import { LoadingState } from '../../../../../components/states/LoadingState';
import { ErrorState } from '../../../../../components/states/ErrorState';
import { RoleGate } from '../../../../../components/RoleGate';
import { SellerNav } from '../../../../../components/SellerNav';
import { applyApiErrorToForm } from '../../../../../services/httpErrorHandling';

const schema = z.object({
  title: z.string().min(1, '請輸入商品名稱').optional(),
  description: z.string().min(1, '請輸入商品描述').optional(),
  price: z.coerce.number().int().min(0, '價格需為整數').optional(),
  stock: z.coerce.number().int().min(0, '庫存需為整數').optional(),
  categoryId: z.string().min(1, '請選擇分類').optional(),
  status: z.enum(['draft', 'active', 'inactive']).optional(),
});

type FormValues = z.infer<typeof schema>;

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  status: 'draft' | 'active' | 'inactive' | 'banned';
  categoryId: string;
};

type Category = { id: string; name: string; status: 'active' | 'inactive' };

export default function EditSellerProductPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const productId = params.productId;

  const product = useQuery({
    queryKey: ['seller-product', productId],
    queryFn: () => apiFetch<{ product: Product }>(`/api/seller/products/${productId}`),
  });

  const categories = useQuery({
    queryKey: ['catalog-categories'],
    queryFn: () => apiFetch<{ items: Category[] }>('/api/catalog/categories'),
  });

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: {},
  });

  useEffect(() => {
    const p = product.data?.product;
    if (!p) return;
    form.reset({
      title: p.title,
      description: p.description,
      price: p.price,
      stock: p.stock,
      categoryId: p.categoryId,
      status: p.status === 'banned' ? 'inactive' : p.status,
    });
  }, [product.data, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch(`/api/seller/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      });
      await product.refetch();
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '更新失敗' });
    }
  });

  const activeCategories = (categories.data?.items ?? []).filter((c) => c.status === 'active');

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">編輯商品</h1>
          <Link href="/seller/products" className="text-sm underline">
            返回列表
          </Link>
        </div>

        <SellerNav />

        {product.isLoading ? <LoadingState /> : null}
        {product.isError ? (
          <ErrorState message={(product.error as unknown as ApiError).message} onRetry={() => product.refetch()} />
        ) : null}

        {product.data ? (
          <form className="max-w-xl space-y-3" onSubmit={onSubmit}>
            {form.formState.errors.root?.message ? (
              <Alert variant="error">{form.formState.errors.root.message}</Alert>
            ) : null}

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
            </div>

            <div>
              <label className="text-sm font-medium">狀態</label>
              <select
                aria-label="status"
                className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm"
                {...form.register('status')}
              >
                <option value="draft">draft</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </div>

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? '更新中…' : '更新'}
            </Button>
          </form>
        ) : null}

        <div className="text-sm text-neutral-700">
          banned 商品只能由管理員操作；此頁僅支援 draft/active/inactive。
        </div>
      </div>
    </RoleGate>
  );
}
