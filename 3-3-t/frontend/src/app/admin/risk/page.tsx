"use client";

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type RiskItem = { organizationId: string; organizationName: string; status: string };
type OverrideItem = { id: string; organizationId: string; forcedStatus: string; revokedAt?: string | null };

export default function AdminRiskPage() {
  const queryClient = useQueryClient();
  const [targetOrgId, setTargetOrgId] = useState('');
  const [forceStatus, setForceStatus] = useState<'Suspended' | 'Expired'>('Suspended');
  const [forceReason, setForceReason] = useState('Manual governance action');
  const [revokeId, setRevokeId] = useState('');

  const { data } = useQuery({ queryKey: ['admin-risk'], queryFn: () => apiFetch('/admin/risk') });
  const { data: latestOverride } = useQuery({
    queryKey: ['admin-override-latest', targetOrgId],
    queryFn: () => apiFetch(`/admin/overrides?organizationId=${encodeURIComponent(targetOrgId)}`),
    enabled: Boolean(targetOrgId),
  });
  const items: RiskItem[] = Array.isArray(data) ? (data as RiskItem[]) : [];
  const latest = (latestOverride ?? null) as OverrideItem | null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-risk'] });
    await queryClient.invalidateQueries({ queryKey: ['admin-override-latest', targetOrgId] });
  };

  const onForce = async () => {
    await apiFetch('/admin/overrides', {
      method: 'POST',
      body: JSON.stringify({ organizationId: targetOrgId, forcedStatus: forceStatus, reason: forceReason }),
    });
    await refresh();
  };

  const onRevoke = async () => {
    await apiFetch(`/admin/overrides/${revokeId}/revoke`, { method: 'PATCH' });
    await refresh();
  };

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Risk Accounts</h1>
        <div className="card space-y-2">
          <h2 className="font-medium">Admin Override Actions</h2>
          <div className="grid gap-2 md:grid-cols-3">
            <input className="rounded border px-2 py-1" value={targetOrgId} onChange={(e) => setTargetOrgId(e.target.value)} placeholder="organizationId" />
            <select className="rounded border px-2 py-1" value={forceStatus} onChange={(e) => setForceStatus(e.target.value as 'Suspended' | 'Expired')}>
              <option value="Suspended">Suspended</option>
              <option value="Expired">Expired</option>
            </select>
            <button className="rounded bg-black px-3 py-1 text-white" disabled={!targetOrgId.trim()} onClick={onForce}>Force Override</button>
          </div>
          <input className="w-full rounded border px-2 py-1" value={forceReason} onChange={(e) => setForceReason(e.target.value)} placeholder="reason" />
          {latest ? <p className="text-xs text-gray-600">Latest Override: {latest.id} ({latest.forcedStatus})</p> : null}
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded border px-2 py-1" value={revokeId} onChange={(e) => setRevokeId(e.target.value)} placeholder="overrideId for revoke" />
            <button className="rounded border px-3 py-1" disabled={!revokeId.trim()} onClick={onRevoke}>Revoke Suspended Override</button>
          </div>
        </div>
        {items.map((item) => (
          <div className="card" key={item.organizationId}>{item.organizationName} - {item.status}</div>
        ))}
      </section>
    </main>
  );
}
