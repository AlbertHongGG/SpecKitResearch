"use client";

import { useMembers } from '@/features/app/hooks';
import { AuthHeader } from '@/components/navigation/auth-header';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';

type MemberItem = { id: string; role: string; status: string; user: { email: string } };

export default function MembersPage() {
  const { data, isLoading, error, refetch } = useMembers();
  const items: MemberItem[] = Array.isArray(data) ? (data as MemberItem[]) : [];

  return (
    <main>
      <AuthHeader organizations={[{ id: 'default-org', name: 'Current Org' }]} isOrgAdmin />
      <section className="container-page space-y-4">
        <h1 className="text-2xl font-semibold">Members</h1>
        {isLoading ? <LoadingState /> : null}
        {error ? <ErrorState message="載入失敗" retry={() => refetch()} /> : null}
        {!isLoading && items.length === 0 ? <EmptyState title="目前沒有成員" /> : null}
        {items.map((item) => (
          <article className="card" key={item.id}>
            <p>{item.user.email}</p>
            <p className="text-sm text-gray-600">{item.role} / {item.status}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
