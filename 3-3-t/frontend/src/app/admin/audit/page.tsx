"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type AuditItem = { id: string; action: string; actorRoleContext: string; organizationId?: string };

export default function AdminAuditPage() {
  const [actorUserId, setActorUserId] = useState('');
  const [actorRoleContext, setActorRoleContext] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [action, setAction] = useState('');

  const { data } = useQuery({
    queryKey: ['admin-audit', actorUserId, actorRoleContext, organizationId, action],
    queryFn: () => {
      const params = new URLSearchParams();
      if (actorUserId) params.set('actorUserId', actorUserId);
      if (actorRoleContext) params.set('actorRoleContext', actorRoleContext);
      if (organizationId) params.set('organizationId', organizationId);
      if (action) params.set('action', action);
      const query = params.toString();
      return apiFetch(`/admin/audit${query ? `?${query}` : ''}`);
    },
  });
  const items: AuditItem[] = Array.isArray(data) ? (data as AuditItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <div className="card grid gap-2 md:grid-cols-2">
          <input className="rounded border px-2 py-1" placeholder="actorUserId" value={actorUserId} onChange={(e) => setActorUserId(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="actorRoleContext" value={actorRoleContext} onChange={(e) => setActorRoleContext(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="organizationId" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} />
          <input className="rounded border px-2 py-1" placeholder="action" value={action} onChange={(e) => setAction(e.target.value)} />
        </div>
        {items.map((item) => (
          <div className="card" key={item.id}>{item.action} - {item.actorRoleContext} - {item.organizationId ?? 'GLOBAL'}</div>
        ))}
      </section>
    </main>
  );
}
