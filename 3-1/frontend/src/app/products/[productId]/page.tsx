'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { routeForAuthError } from '../../../services/httpErrorHandling';
import { Button } from '../../../components/ui/Button';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  status: string;
  categoryId: string;
  sellerId: string;
};

export default function ProductDetailPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const productId = params.productId;

  const product = useQuery({
    queryKey: ['catalog', 'product', productId],
    queryFn: () => apiFetch<Product>(`/api/catalog/products/${productId}`),
  });

  const add = useMutation({
    mutationFn: async () => {
      await apiFetch<{ ok: true }>(`/api/cart/items`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity: 1 }),
      });
    },
    onError: (err) => {
      const status = (err as ApiError).status;
      const route = routeForAuthError(status);
      if (route) router.push(route + `?next=${encodeURIComponent(`/products/${productId}`)}`);
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">商品詳情</h1>
        <Link className="text-sm text-neutral-700 underline" href="/">
          回到商品
        </Link>
      </div>

      {product.isLoading ? <LoadingState /> : null}
      {product.isError ? (
        <ErrorState message={(product.error as any)?.message} onRetry={() => product.refetch()} />
      ) : null}

      {product.data ? (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4">
          <div className="text-lg font-semibold">{product.data.title}</div>
          <div className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{product.data.description}</div>
          <div className="mt-3 text-sm">價格：NT$ {Math.round(product.data.price / 100)}</div>
          <div className="mt-1 text-sm text-neutral-700">庫存：{product.data.stock}</div>

          <div className="mt-4 flex gap-2">
            <Button disabled={add.isPending || product.data.stock <= 0} onClick={() => add.mutate()}>
              加入購物車
            </Button>
            <Link href="/cart" className="text-sm underline self-center">
              前往購物車
            </Link>
          </div>
          {add.isError ? (
            <div className="mt-3 text-sm text-red-700">{(add.error as any)?.message ?? '加入失敗'}</div>
          ) : null}
          {add.isSuccess ? <div className="mt-3 text-sm text-green-700">已加入購物車</div> : null}
        </div>
      ) : null}
    </div>
  );
}
