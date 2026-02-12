'use client';

import { useMe, type Me } from '../hooks/useMe';
import { LoadingState } from './states/LoadingState';
import { ErrorState } from './states/ErrorState';

type Role = Me['roles'][number];

type Props = {
  allow: Role[];
  children: React.ReactNode;
};

export function RoleGate({ allow, children }: Props) {
  const me = useMe();

  if (me.isLoading) return <LoadingState />;

  if (me.isError) {
    return <ErrorState message={(me.error as any)?.message ?? '載入使用者資訊失敗'} onRetry={() => me.refetch()} />;
  }

  const roles = me.data?.roles ?? [];
  const ok = allow.some((r) => roles.includes(r));

  if (!ok) {
    return (
      <div className="rounded border border-neutral-200 bg-white p-4">
        <div className="text-sm font-medium">你沒有權限存取此頁面</div>
        <div className="mt-1 text-sm text-neutral-700">需要角色：{allow.join(', ')}</div>
      </div>
    );
  }

  return <>{children}</>;
}
