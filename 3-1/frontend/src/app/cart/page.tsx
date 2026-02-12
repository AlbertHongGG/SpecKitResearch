'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { LoadingState } from '../../components/states/LoadingState';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

type CartItem = {
  productId: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price: number;
    stock: number;
    status: string;
  };
};

export default function CartPage() {
  const qc = useQueryClient();

  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<{ items: CartItem[] }>('/api/cart'),
  });

  const update = useMutation({
    mutationFn: async (params: { productId: string; quantity: number }) => {
      await apiFetch(`/api/cart/items/${params.productId}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: params.quantity }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  const remove = useMutation({
    mutationFn: async (productId: string) => {
      await apiFetch(`/api/cart/items/${productId}`, { method: 'DELETE' });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cart'] }),
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">購物車</h1>
        <Link className="text-sm underline" href="/">
          繼續逛
        </Link>
      </div>

      {cart.isLoading ? <LoadingState /> : null}
      {cart.isError ? (
        <ErrorState message={(cart.error as ApiError).message} onRetry={() => cart.refetch()} />
      ) : null}

      {cart.data && cart.data.items.length === 0 ? (
        <EmptyState
          title="購物車是空的"
          message="從商品頁加入一些商品吧。"
          action={
            <Link className="underline text-sm" href="/">
              回到商品列表
            </Link>
          }
        />
      ) : null}

      <div className="mt-4 space-y-3">
        {cart.data?.items.map((it) => (
          <div key={it.productId} className="rounded border border-neutral-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{it.product.title}</div>
                <div className="mt-1 text-sm text-neutral-700">NT$ {Math.round(it.product.price / 100)}</div>
              </div>
              <Button variant="secondary" onClick={() => remove.mutate(it.productId)}>
                移除
              </Button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm">數量</span>
              <input
                className="w-20 rounded border border-neutral-300 px-2 py-1 text-sm"
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => update.mutate({ productId: it.productId, quantity: Number(e.target.value) })}
              />
            </div>
          </div>
        ))}
      </div>

      {cart.data?.items.length ? (
        <div className="mt-6 flex justify-end">
          <Link href="/checkout">
            <Button>前往結帳</Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
