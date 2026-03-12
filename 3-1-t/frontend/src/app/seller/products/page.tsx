'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { sellerProductsApi } from '@/services/seller/products/api';

export default function SellerProductsPage() {
  const guard = useRolePageGuard('SELLER');
  const { data } = useQuery({ queryKey: ['seller-products'], queryFn: sellerProductsApi.list });
  const products = (data as Array<{ id: string; name: string; status: string }> | undefined) ?? [];

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Seller Products</h1>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link href="/seller/apply" className="underline">
          Seller Application
        </Link>
        <Link href="/seller/products/new" className="underline">
          Create Product
        </Link>
        <Link href="/seller/orders" className="underline">
          Seller Orders
        </Link>
        <Link href="/seller/settlements" className="underline">
          Settlements
        </Link>
      </div>
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
