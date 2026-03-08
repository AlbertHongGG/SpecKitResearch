"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type AdminSubscriptionItem = { id: string; organizationId: string; status: string };

export default function AdminSubscriptionsPage() {
  const { data } = useQuery({ queryKey: ['admin-subscriptions'], queryFn: () => apiFetch('/admin/subscriptions') });
  const items: AdminSubscriptionItem[] = Array.isArray(data) ? (data as AdminSubscriptionItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Admin Subscriptions</h1>
        {items.map((item) => (
          <div className="card" key={item.id}>{item.organizationId} - {item.status}</div>
        ))}
      </section>
    </main>
  );
}
