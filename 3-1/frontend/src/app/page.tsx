'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, type ApiError } from '../services/apiClient';
import { LoadingState } from '../components/states/LoadingState';
import { ErrorState } from '../components/states/ErrorState';
import { EmptyState } from '../components/states/EmptyState';

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  status: string;
};

export default function HomePage() {
  const products = useQuery({
    queryKey: ['catalog', 'products', { q: '' }],
    queryFn: () => apiFetch<{ items: Product[] }>('/api/catalog/products'),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">商品</h1>
        <Link className="text-sm underline" href="/search">
          搜尋
        </Link>
      </div>

      {products.isLoading ? <LoadingState /> : null}
      {products.isError ? (
        <ErrorState message={(products.error as ApiError).message} onRetry={() => products.refetch()} />
      ) : null}
      {products.data && products.data.items.length === 0 ? <EmptyState title="目前沒有商品" /> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {products.data?.items.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="rounded border border-neutral-200 bg-white p-4 hover:border-neutral-300"
          >
            <div className="font-semibold">{p.title}</div>
            <div className="mt-1 line-clamp-2 text-sm text-neutral-700">{p.description}</div>
            <div className="mt-2 text-sm">NT$ {Math.round(p.price / 100)}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
