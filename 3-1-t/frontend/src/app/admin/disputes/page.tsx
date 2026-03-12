'use client';

import { useQuery } from '@tanstack/react-query';

import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { adminDisputesApi } from '@/services/admin/disputes/api';

export default function AdminDisputesPage() {
  const guard = useRolePageGuard('ADMIN');
  const { data, refetch } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: adminDisputesApi.list,
  });
  const disputes = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Disputes</h1>
      <ul className="space-y-2">
        {disputes.map((item) => (
          <li key={item.id} className="rounded border p-3">
            {item.id} · {item.status}
            <button
              className="ml-2 rounded bg-black px-3 py-1 text-white"
              onClick={async () => {
                await adminDisputesApi.resolve(item.id, 'Resolved by admin');
                await refetch();
              }}
            >
              Resolve
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
