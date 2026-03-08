"use client";

import { usePaymentMethods } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';

type PaymentMethodItem = { id: string; provider: string; isDefault: boolean };

export default function PaymentMethodsPage() {
  const { data, isLoading, error, refetch } = usePaymentMethods();
  const items: PaymentMethodItem[] = Array.isArray(data) ? (data as PaymentMethodItem[]) : [];

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && items.length === 0 ? <EmptyState title="尚未設定付款方式" /> : null}
        {items.map((item) => (
          <article className="card" key={item.id}>
            <p>{item.provider}</p>
            <p className="text-sm text-gray-600">default: {item.isDefault ? 'yes' : 'no'}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
