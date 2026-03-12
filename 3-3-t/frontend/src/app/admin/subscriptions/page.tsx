"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type AdminSubscriptionItem = { id: string; organizationId: string; status: string };

export default function AdminSubscriptionsPage() {
  const [status, setStatus] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-subscriptions', status, organizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (organizationId) params.set('organizationId', organizationId);
      const query = params.toString();
      return apiFetch(`/admin/subscriptions${query ? `?${query}` : ''}`);
    },
  });
  const items: AdminSubscriptionItem[] = Array.isArray(data) ? (data as AdminSubscriptionItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Admin Subscriptions</h1>
        <div className="card grid gap-2 md:grid-cols-2">
          <input className="rounded border px-2 py-1" placeholder="status" value={status} onChange={(e) => setStatus(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="organizationId" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
        </div>
        {items.map((item) => (
          <div className="card" key={item.id}>{item.organizationId} - {item.status}</div>
        ))}
      </section>
    </main>
  );
}
