'use client';

import { useQuery } from '@tanstack/react-query';

import { UsersTable } from '@/components/admin/UsersTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { copy } from '@/lib/copy';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export default function AdminUsersPage() {
  const q = useQuery({ queryKey: queryKeys.adminUsers(), queryFn: adminClient.listUsers });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? copy.errors.loadFailed} />;
  if (!q.data) return <Loading />;

  if (q.data.users.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">使用者管理</h1>
        <div className="mt-6">
          <EmptyState title="目前沒有使用者" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">使用者管理</h1>
      <div className="mt-6">
        <UsersTable users={q.data.users} />
      </div>
    </div>
  );
}
