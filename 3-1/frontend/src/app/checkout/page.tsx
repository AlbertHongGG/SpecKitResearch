'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
  };
};

export default function CheckoutPage() {
  const qc = useQueryClient();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [txId] = useState(() => `tx_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  const cart = useQuery({
    queryKey: ['cart'],
    queryFn: () => apiFetch<{ items: CartItem[] }>('/api/cart'),
  });

  const total = useMemo(() => {
    return (cart.data?.items ?? []).reduce((sum, it) => sum + it.product.price * it.quantity, 0);
  }, [cart.data]);

  const checkout = useMutation({
    mutationFn: async () => {
      const res = await apiFetch<{ orderId: string }>('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({ paymentMethod: 'mock', transactionId: txId }),
      });
      return res;
    },
    onSuccess: async (res) => {
      setOrderId(res.orderId);
      await qc.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const pay = useMutation({
    mutationFn: async () => {
      if (!orderId) throw new Error('missing orderId');
      const eventId = `evt_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      await apiFetch('/api/payments/webhook', {
        method: 'POST',
        body: JSON.stringify({
          provider: 'mock',
          eventId,
          orderId,
          transactionId: txId,
          status: 'succeeded',
          paymentMethod: 'mock',
        }),
      });
    },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">結帳</h1>
        <Link className="text-sm underline" href="/cart">
          回購物車
        </Link>
      </div>

      {cart.isLoading ? <LoadingState /> : null}
      {cart.isError ? (
        <ErrorState message={(cart.error as ApiError).message} onRetry={() => cart.refetch()} />
      ) : null}

      {cart.data && cart.data.items.length === 0 ? (
        <EmptyState title="購物車是空的" message="先加入商品再結帳。" action={<Link className="underline text-sm" href="/">回到商品</Link>} />
      ) : null}

      {cart.data?.items.length ? (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4">
          <div className="font-semibold">訂單摘要</div>
          <div className="mt-2 space-y-1 text-sm text-neutral-800">
            {cart.data.items.map((it) => (
              <div key={it.productId} className="flex justify-between">
                <span>
                  {it.product.title} × {it.quantity}
                </span>
                <span>NT$ {Math.round((it.product.price * it.quantity) / 100)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t pt-3 flex justify-between font-semibold">
            <span>合計</span>
            <span>NT$ {Math.round(total / 100)}</span>
          </div>

          {!orderId ? (
            <div className="mt-4">
              <Button disabled={checkout.isPending} onClick={() => checkout.mutate()}>
                {checkout.isPending ? '建立訂單中…' : '建立訂單'}
              </Button>
              {checkout.isError ? (
                <div className="mt-2 text-sm text-red-700">{(checkout.error as ApiError).message}</div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4">
              <div className="text-sm">已建立訂單：{orderId}</div>
              <div className="mt-3 flex gap-2">
                <Button disabled={pay.isPending} onClick={() => pay.mutate()}>
                  {pay.isPending ? '付款中…' : '模擬付款成功'}
                </Button>
                <Link className="self-center text-sm underline" href={`/payment/result?orderId=${encodeURIComponent(orderId)}`}>
                  前往付款結果
                </Link>
              </div>
              {pay.isError ? (
                <div className="mt-2 text-sm text-red-700">{(pay.error as any)?.message ?? '付款失敗'}</div>
              ) : null}
              {pay.isSuccess ? (
                <div className="mt-2 text-sm text-green-700">
                  已觸發付款 callback。前往付款結果頁查看狀態。
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
