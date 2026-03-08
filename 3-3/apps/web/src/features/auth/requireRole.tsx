'use client';

import * as React from 'react';
import { useMe } from './useMe';

export function RequireOrgRole(props: {
  role: 'END_USER' | 'ORG_ADMIN';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const me = useMe();
  const current = me.data?.currentOrganization ?? null;

  if (me.isLoading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Loading…</div>;
  }

  if (me.error || !current) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Authentication required.</div>
    );
  }

  const ok = props.role === 'END_USER' ? true : current.memberRole === 'ORG_ADMIN';

  if (!ok) {
    return (
      props.fallback ?? (
        <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          <div className="font-medium text-zinc-900">Access denied</div>
          <div className="mt-1 text-zinc-600">You don’t have permission to view this page.</div>
        </div>
      )
    );
  }

  return <>{props.children}</>;
}
