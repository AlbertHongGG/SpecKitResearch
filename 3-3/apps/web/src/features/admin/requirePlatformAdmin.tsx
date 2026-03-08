'use client';

import * as React from 'react';
import { useMe } from '../auth/useMe';

export function RequirePlatformAdmin(props: { children: React.ReactNode }) {
  const me = useMe();

  if (me.isLoading) {
    return <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">Loading…</div>;
  }

  if (me.error || !me.data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Authentication required.</div>
    );
  }

  if (!me.data.user.isPlatformAdmin) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
        <div className="font-medium text-zinc-900">Access denied</div>
        <div className="mt-1 text-zinc-600">Platform admin permission required.</div>
      </div>
    );
  }

  return <>{props.children}</>;
}
