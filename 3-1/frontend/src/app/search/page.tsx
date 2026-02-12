'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiFetch } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/states/LoadingState';
import { ErrorState } from '../../components/states/ErrorState';
import { EmptyState } from '../../components/states/EmptyState';

type Product = {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  status: string;
};

export default function SearchPage() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [draft, setDraft] = useState(q);

  const queryKey = useMemo(() => ['catalog', 'products', { q }], [q]);
  const products = useQuery({
    queryKey,
    queryFn: () => apiFetch<{ items: Product[] }>(`/api/catalog/products?q=${encodeURIComponent(q)}`),
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">搜尋</h1>
        <Link className="text-sm text-neutral-700 underline" href="/">
          回到商品
        </Link>
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const url = new URL(window.location.href);
          url.pathname = '/search';
          if (draft.trim()) url.searchParams.set('q', draft.trim());
          else url.searchParams.delete('q');
          router.push(url.pathname + url.search);
        }}
      >
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="輸入關鍵字" />
        <Button type="submit">搜尋</Button>
      </form>

      <div className="mt-6">
        {products.isLoading ? <LoadingState /> : null}
        {products.isError ? (
          <ErrorState
            message={(products.error as any)?.message}
            onRetry={() => products.refetch()}
          />
        ) : null}
        {products.data && products.data.items.length === 0 ? (
          <EmptyState title="找不到商品" message="換個關鍵字試試看。" />
        ) : null}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
    </div>
  );
}
