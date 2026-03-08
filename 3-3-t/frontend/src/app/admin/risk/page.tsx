"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type RiskItem = { organizationId: string; organizationName: string; status: string };

export default function AdminRiskPage() {
  const { data } = useQuery({ queryKey: ['admin-risk'], queryFn: () => apiFetch('/admin/risk') });
  const items: RiskItem[] = Array.isArray(data) ? (data as RiskItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Risk Accounts</h1>
        {items.map((item) => (
          <div className="card" key={item.organizationId}>{item.organizationName} - {item.status}</div>
        ))}
      </section>
    </main>
  );
}
