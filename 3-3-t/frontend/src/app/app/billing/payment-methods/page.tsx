"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePaymentMethods } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

type PaymentMethodItem = { id: string; provider: string; providerPaymentMethodRef: string; isDefault: boolean };

export default function PaymentMethodsPage() {
  const queryClient = useQueryClient();
  const { organizationId } = useSession();
  const [provider, setProvider] = useState('stripe');
  const [providerRef, setProviderRef] = useState('pm_test_001');
  const [isDefault, setIsDefault] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = usePaymentMethods();
  const items: PaymentMethodItem[] = Array.isArray(data) ? (data as PaymentMethodItem[]) : [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['payment-methods', organizationId] });
  };

  const onAdd = async () => {
    await apiFetch(
      '/payment-methods',
      {
        method: 'POST',
        body: JSON.stringify({ provider, providerPaymentMethodRef: providerRef, isDefault }),
      },
      organizationId,
    );
    setProviderRef('');
    setIsDefault(false);
    await refresh();
  };

  const onSetDefault = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/payment-methods/${id}/default`, { method: 'PATCH' }, organizationId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (id: string) => {
    setBusyId(id);
    try {
      await apiFetch(`/payment-methods/${id}`, { method: 'DELETE' }, organizationId);
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <div className="card space-y-2">
          <h2 className="font-medium">Add Payment Method</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <input className="rounded border px-2 py-1" value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="provider" />
            <input className="rounded border px-2 py-1" value={providerRef} onChange={(e) => setProviderRef(e.target.value)} placeholder="provider ref" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
              Set as default
            </label>
          </div>
          <button className="rounded bg-black px-3 py-1 text-white" onClick={onAdd} disabled={!providerRef.trim()}>
            Add
          </button>
        </div>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && items.length === 0 ? <EmptyState title="尚未設定付款方式" /> : null}
        {items.map((item) => (
          <article className="card space-y-2" key={item.id}>
            <p>{item.provider}</p>
            <p className="text-xs text-gray-500">ref: {item.providerPaymentMethodRef}</p>
            <p className="text-sm text-gray-600">default: {item.isDefault ? 'yes' : 'no'}</p>
            <div className="flex gap-2">
              <button className="rounded border px-2 py-1 text-xs" disabled={item.isDefault || busyId === item.id} onClick={() => onSetDefault(item.id)}>
                Set Default
              </button>
              <button className="rounded border px-2 py-1 text-xs" disabled={busyId === item.id} onClick={() => onRemove(item.id)}>
                Remove
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
