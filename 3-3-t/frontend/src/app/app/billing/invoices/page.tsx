"use client";

import { useInvoices } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';

type InvoiceItem = {
  id: string;
  status: string;
  totalCents: number;
  currency: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
};

export default function InvoicesPage() {
  const { data, isLoading, error, refetch } = useInvoices();
  const items: InvoiceItem[] = Array.isArray((data as { items?: unknown[] } | undefined)?.items)
    ? (((data as { items?: unknown[] }).items ?? []) as InvoiceItem[])
    : [];

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && items.length === 0 ? <EmptyState title="目前沒有 invoice" /> : null}
        {items.map((invoice) => (
          <article className="card" key={invoice.id}>
            <p className="font-medium">{invoice.status}</p>
            <p>{invoice.totalCents} {invoice.currency}</p>
            <p className="text-sm text-gray-600">{invoice.billingPeriodStart} ~ {invoice.billingPeriodEnd}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
