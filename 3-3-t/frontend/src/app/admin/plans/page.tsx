"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type PlanItem = { id: string; name: string; billingCycle: string };

export default function AdminPlansPage() {
  const { data } = useQuery({ queryKey: ['admin-plans'], queryFn: () => apiFetch('/admin/plans') });
  const plans: PlanItem[] = Array.isArray(data) ? (data as PlanItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Admin Plans</h1>
        {plans.map((plan) => (
          <div className="card" key={plan.id}>{plan.name} - {plan.billingCycle}</div>
        ))}
      </section>
    </main>
  );
}
