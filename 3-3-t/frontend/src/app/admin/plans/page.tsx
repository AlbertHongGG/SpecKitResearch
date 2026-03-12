"use client";

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type PlanItem = {
  id: string;
  name: string;
  billingCycle: string;
  priceCents: number;
  currency: string;
  isActive: boolean;
  limits: string;
  features: string;
};

export default function AdminPlansPage() {
  const queryClient = useQueryClient();
  const [createName, setCreateName] = useState('Pro Plus');
  const [createCycle, setCreateCycle] = useState('monthly');
  const [createPrice, setCreatePrice] = useState(2999);
  const [createCurrency, setCreateCurrency] = useState('USD');
  const [createLimits, setCreateLimits] = useState('{"API_CALLS":200000,"USER_COUNT":50,"PROJECT_COUNT":200,"STORAGE_BYTES":21474836480}');
  const [createFeatures, setCreateFeatures] = useState('{"advancedAnalytics":true,"exportData":true,"prioritySupport":true}');

  const [editPrice, setEditPrice] = useState<Record<string, number>>({});
  const [editLimits, setEditLimits] = useState<Record<string, string>>({});
  const [editFeatures, setEditFeatures] = useState<Record<string, string>>({});

  const { data } = useQuery({ queryKey: ['admin-plans'], queryFn: () => apiFetch('/admin/plans') });
  const plans: PlanItem[] = Array.isArray(data) ? (data as PlanItem[]) : [];

  useEffect(() => {
    plans.forEach((plan) => {
      if (!(plan.id in editPrice)) {
        setEditPrice((prev) => ({ ...prev, [plan.id]: plan.priceCents }));
      }
      if (!(plan.id in editLimits)) {
        setEditLimits((prev) => ({ ...prev, [plan.id]: plan.limits }));
      }
      if (!(plan.id in editFeatures)) {
        setEditFeatures((prev) => ({ ...prev, [plan.id]: plan.features }));
      }
    });
  }, [plans, editPrice, editLimits, editFeatures]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
  };

  const onCreate = async () => {
    await apiFetch('/admin/plans', {
      method: 'POST',
      body: JSON.stringify({
        name: createName,
        billingCycle: createCycle,
        priceCents: createPrice,
        currency: createCurrency,
        limits: JSON.parse(createLimits),
        features: JSON.parse(createFeatures),
      }),
    });
    await refresh();
  };

  const onToggle = async (plan: PlanItem) => {
    await apiFetch(`/admin/plans/${plan.id}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive: !plan.isActive }),
    });
    await refresh();
  };

  const onSaveEdit = async (plan: PlanItem) => {
    await apiFetch(`/admin/plans/${plan.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        priceCents: editPrice[plan.id] ?? plan.priceCents,
        limits: JSON.parse(editLimits[plan.id] ?? plan.limits),
        features: JSON.parse(editFeatures[plan.id] ?? plan.features),
      }),
    });
    await refresh();
  };

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Admin Plans</h1>
        <div className="card space-y-2">
          <h2 className="font-medium">Create Plan</h2>
          <div className="grid gap-2 md:grid-cols-4">
            <input className="rounded border px-2 py-1" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="name" />
            <input className="rounded border px-2 py-1" value={createCycle} onChange={(e) => setCreateCycle(e.target.value)} placeholder="billing cycle" />
            <input className="rounded border px-2 py-1" type="number" value={createPrice} onChange={(e) => setCreatePrice(Number(e.target.value))} placeholder="priceCents" />
            <input className="rounded border px-2 py-1" value={createCurrency} onChange={(e) => setCreateCurrency(e.target.value)} placeholder="currency" />
          </div>
          <textarea className="w-full rounded border p-2 text-xs" rows={3} value={createLimits} onChange={(e) => setCreateLimits(e.target.value)} />
          <textarea className="w-full rounded border p-2 text-xs" rows={3} value={createFeatures} onChange={(e) => setCreateFeatures(e.target.value)} />
          <button className="rounded bg-black px-3 py-1 text-white" onClick={onCreate}>Create</button>
        </div>
        {plans.map((plan) => (
          <div className="card space-y-2" key={plan.id}>
            <p className="font-medium">{plan.name} - {plan.billingCycle}</p>
            <p className="text-sm text-gray-600">active: {plan.isActive ? 'yes' : 'no'}</p>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="rounded border px-2 py-1"
                type="number"
                value={editPrice[plan.id] ?? plan.priceCents}
                onChange={(e) => setEditPrice((prev) => ({ ...prev, [plan.id]: Number(e.target.value) }))}
              />
              <button className="rounded border px-2 py-1 text-xs" onClick={() => onToggle(plan)}>
                {plan.isActive ? 'Disable' : 'Enable'}
              </button>
            </div>
            <textarea
              className="w-full rounded border p-2 text-xs"
              rows={3}
              value={editLimits[plan.id] ?? plan.limits}
              onChange={(e) => setEditLimits((prev) => ({ ...prev, [plan.id]: e.target.value }))}
            />
            <textarea
              className="w-full rounded border p-2 text-xs"
              rows={3}
              value={editFeatures[plan.id] ?? plan.features}
              onChange={(e) => setEditFeatures((prev) => ({ ...prev, [plan.id]: e.target.value }))}
            />
            <button className="rounded bg-black px-3 py-1 text-white" onClick={() => onSaveEdit(plan)}>
              Save
            </button>
          </div>
        ))}
      </section>
    </main>
  );
}
