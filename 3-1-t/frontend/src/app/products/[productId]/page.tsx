import { ErrorState } from '@/components/ui/ErrorState';
import { AddToCartButton } from '@/components/ui/AddToCartButton';
import { fetchProductDetail } from '@/services/catalog/api';

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  try {
    const product = (await fetchProductDetail(productId)) as {
      name?: string;
      description?: string;
      priceCents?: number;
      available?: boolean;
      message?: string;
      status?: string;
    };

    if (product.status === 'BANNED' || product.available === false) {
      return (
        <main className="mx-auto max-w-4xl px-6 py-10">
          <h1 className="text-2xl font-semibold">Product unavailable</h1>
          <p className="mt-2 text-sm text-black/70">
            {product.message ?? 'This item cannot be purchased.'}
          </p>
        </main>
      );
    }

    return (
      <main className="mx-auto max-w-4xl space-y-4 px-6 py-10">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="text-sm text-black/70">{product.description}</p>
        <p className="text-base font-medium">${((product.priceCents ?? 0) / 100).toFixed(2)}</p>
        <AddToCartButton disabled={product.available === false} productId={productId} />
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState />
      </main>
    );
  }
}
