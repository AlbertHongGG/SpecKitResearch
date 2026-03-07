'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { sellerProductsApi } from '@/services/seller/products/api';

export default function SellerProductsPage() {
  const { data } = useQuery({ queryKey: ['seller-products'], queryFn: sellerProductsApi.list });
  const products = (data as Array<{ id: string; name: string; status: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Products</h1>
      <Link href="/seller/products/new" className="text-sm underline">
        Create Product
      </Link>
      <ul className="space-y-2">
        {products.map((product) => (
          <li key={product.id} className="rounded border p-3">
            <Link href={`/seller/products/${product.id}/edit`}>{product.name}</Link> ·{' '}
            {product.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
