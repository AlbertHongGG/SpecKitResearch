'use client';

import * as React from 'react';
import { useMe } from '../auth/useMe';
import { useSetActiveOrg } from './useActiveOrg';

export function OrgSwitcher() {
  const me = useMe();
  const setActive = useSetActiveOrg();

  const currentId = me.data?.currentOrganization?.id ?? '';

  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-zinc-500">Org</label>
      <select
        className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-sm text-zinc-900"
        value={currentId}
        disabled={me.isLoading || setActive.isPending || !me.data}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) return;
          setActive.mutate(next);
        }}
      >
        {(me.data?.organizations ?? []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} ({o.memberRole})
          </option>
        ))}
      </select>
    </div>
  );
}
