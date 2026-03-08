"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type UsageRankingItem = { organizationId: string; organizationName: string; value: number };

export default function AdminUsageRankingPage() {
  const { data } = useQuery({ queryKey: ['admin-usage-ranking'], queryFn: () => apiFetch('/admin/metrics/usage') });
  const items: UsageRankingItem[] = Array.isArray(data) ? (data as UsageRankingItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Usage Ranking</h1>
        {items.map((item) => (
          <div className="card" key={item.organizationId}>{item.organizationName} - {item.value}</div>
        ))}
      </section>
    </main>
  );
}
