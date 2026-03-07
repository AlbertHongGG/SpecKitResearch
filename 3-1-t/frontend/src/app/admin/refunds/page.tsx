'use client';

import { useQuery } from '@tanstack/react-query';

import { adminRefundsApi } from '@/services/admin/refunds/api';

export default function AdminRefundsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: adminRefundsApi.list,
  });
  const refunds = (data as Array<{ id: string; status: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Refunds</h1>
      <ul className="space-y-2">
        {refunds.map((item) => (
          <li key={item.id} className="rounded border p-3">
            {item.id} · {item.status}
            <div className="mt-2 flex gap-2">
              <button
                className="rounded bg-black px-3 py-1 text-white"
                onClick={async () => {
                  await adminRefundsApi.approve(item.id);
                  await refetch();
                }}
              >
                Approve
              </button>
              <button
                className="rounded border px-3 py-1"
                onClick={async () => {
                  await adminRefundsApi.reject(item.id);
                  await refetch();
                }}
              >
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
