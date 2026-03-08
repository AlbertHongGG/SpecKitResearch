"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { AdminHeader } from '@/components/navigation/admin-header';

type AuditItem = { id: string; action: string; actorRoleContext: string };

export default function AdminAuditPage() {
  const { data } = useQuery({ queryKey: ['admin-audit'], queryFn: () => apiFetch('/admin/audit') });
  const items: AuditItem[] = Array.isArray(data) ? (data as AuditItem[]) : [];

  return (
    <main>
      <AdminHeader />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        {items.map((item) => (
          <div className="card" key={item.id}>{item.action} - {item.actorRoleContext}</div>
        ))}
      </section>
    </main>
  );
}
