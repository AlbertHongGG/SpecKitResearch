'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { EmptyState } from '../../../components/states/EmptyState';
import { Button } from '../../../components/ui/Button';
import { RoleGate } from '../../../components/RoleGate';
import { SellerNav } from '../../../components/SellerNav';

type Product = {
  id: string;
  title: string;
  status: string;
  price: number;
  stock: number;
  createdAt: string;
};

export default function SellerProductsPage() {
  const products = useQuery({
    queryKey: ['seller-products'],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/seller/products'),
  });

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">賣家後台</h1>
          <Link href="/seller/products/new">
            <Button>新增商品</Button>
          </Link>
        </div>

        <SellerNav />

        {products.isLoading ? <LoadingState /> : null}
        {products.isError ? (
          <ErrorState message={(products.error as unknown as ApiError).message} onRetry={() => products.refetch()} />
        ) : null}

        {products.data && products.data.items.length === 0 ? <EmptyState title="尚未建立商品" /> : null}

        <div className="space-y-3">
          {products.data?.items.map((p) => (
            <Link
              key={p.id}
              href={`/seller/products/${p.id}/edit`}
              className="block rounded border border-neutral-200 bg-white p-4 hover:border-neutral-300"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.title}</div>
                <div className="text-sm text-neutral-700">{p.status}</div>
              </div>
              <div className="mt-1 text-sm text-neutral-700">
                價格：NT$ {Math.round(p.price / 100)} · 庫存：{p.stock}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
