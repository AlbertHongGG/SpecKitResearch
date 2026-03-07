import Link from 'next/link';

import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchProducts } from '@/services/catalog/api';

export default async function HomePage() {
  try {
    const result = (await fetchProducts()) as {
      items?: Array<{ id: string; name: string; priceCents: number }>;
    };
    const items = result.items ?? [];

    if (items.length === 0) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <Empty title="No products available" />
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
        <h1 className="text-3xl font-semibold">Marketplace</h1>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3">
              <Link href={`/products/${item.id}`} className="font-medium underline">
                {item.name}
              </Link>
              <p className="text-sm text-black/70">${(item.priceCents / 100).toFixed(2)}</p>
            </li>
          ))}
        </ul>
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10">
        <ErrorState />
      </main>
    );
  }
}
