"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type RevenueMetrics = { mrrCents: number; churnRate: number };

export default function AdminRevenueMetricsPage() {
  const { data } = useQuery({ queryKey: ['admin-revenue-metrics'], queryFn: () => apiFetch('/admin/metrics/revenue') });
  const metrics = (data ?? {}) as Partial<RevenueMetrics>;

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Revenue Metrics</h1>
        <div className="card">MRR: {metrics.mrrCents ?? 0}</div>
        <div className="card">Churn: {metrics.churnRate ?? 0}</div>
      </section>
    </main>
  );
}
