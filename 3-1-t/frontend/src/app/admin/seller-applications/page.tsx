'use client';

import { useQuery } from '@tanstack/react-query';

import { adminSellerApplicationsApi } from '@/services/admin/seller-applications/api';

export default function AdminSellerApplicationsPage() {
  const { data, refetch } = useQuery({
    queryKey: ['admin-seller-applications'],
    queryFn: adminSellerApplicationsApi.list,
  });
  const applications =
    (data as Array<{ id: string; status: string; userId: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Seller Applications</h1>
      <ul className="space-y-2">
        {applications.map((app) => (
          <li key={app.id} className="rounded border p-3">
            {app.userId} · {app.status}
            <div className="mt-2 flex gap-2">
              <button
                className="rounded bg-black px-3 py-1 text-white"
                onClick={async () => {
                  await adminSellerApplicationsApi.approve(app.id);
                  await refetch();
                }}
              >
                Approve
              </button>
              <button
                className="rounded border px-3 py-1"
                onClick={async () => {
                  await adminSellerApplicationsApi.reject(app.id);
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
