'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { ErrorState, LoadingState, EmptyState } from '@/components/PageStates';
import { LogoutButton } from '@/features/auth/LogoutButton';

type Org = {
  id: string;
  name: string;
  status: 'active' | 'suspended';
  plan: 'free' | 'paid';
  roleInOrg: 'org_admin' | 'org_member';
};

export default function OrgsPage() {
  const q = useQuery({
    queryKey: ['orgs'],
    queryFn: async () => {
      return await apiFetch<{ organizations: Org[] }>('/orgs');
    },
    retry: false,
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState title="載入失敗" message={String((q.error as any)?.message ?? '')} />;

  if (!q.data) return <ErrorState title="載入失敗" message="No data" />;

  const orgs = q.data.organizations;
  if (!orgs.length) return <EmptyState title="尚無組織" description="請請 Org Admin 邀請你加入。" />;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">你的 Organizations</h1>
        <LogoutButton />
      </div>

      <ul className="mt-4 space-y-2">
        {orgs.map((o) => (
          <li key={o.id} className="rounded border p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{o.name}</div>
                <div className="text-sm text-slate-600">
                  {o.status} / {o.plan} / {o.roleInOrg}
                </div>
              </div>
              <a className="text-sm text-blue-700 underline" href={`/orgs/${o.id}/projects`}>
                專案
              </a>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
