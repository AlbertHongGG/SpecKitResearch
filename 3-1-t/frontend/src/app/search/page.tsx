import Link from 'next/link';

import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { fetchProducts } from '@/services/catalog/api';

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; categoryId?: string }>;
}) {
  const params = await searchParams;
  try {
    const data = (await fetchProducts({ q: params.q, categoryId: params.categoryId })) as {
      items?: Array<{ id: string; name: string; priceCents: number }>;
    };

    const items = data.items ?? [];
    if (items.length === 0) {
      return (
        <main className="mx-auto max-w-5xl px-6 py-10">
          <Empty title="No products" />
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">Search</h1>
        <form className="grid gap-3 rounded border p-4 sm:grid-cols-[1fr_200px_auto]" method="get">
          <input
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Search products"
            className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-black"
          />
          <input
            name="categoryId"
            defaultValue={params.categoryId ?? ''}
            placeholder="Category ID"
            className="w-full rounded-md border border-black/20 px-3 py-2 outline-none focus:border-black"
          />
          <button
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
            type="submit"
          >
            Search
          </button>
        </form>
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3">
              <Link className="font-medium underline" href={`/products/${item.id}`}>
                {item.name}
              </Link>
              <div className="text-sm text-black/70">${(item.priceCents / 100).toFixed(2)}</div>
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
