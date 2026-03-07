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
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded border p-3">
              <div className="font-medium">{item.name}</div>
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
