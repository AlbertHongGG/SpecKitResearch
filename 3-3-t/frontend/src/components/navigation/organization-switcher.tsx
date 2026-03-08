"use client";

import { useSession } from '@/lib/auth/session-context';

export function OrganizationSwitcher({ organizations }: { organizations: { id: string; name: string }[] }) {
  const { organizationId, setSession } = useSession();

  if (!organizations.length) return null;

  return (
    <select
      className="rounded border px-2 py-1 text-sm"
      value={organizationId || organizations[0].id}
      onChange={(e) => setSession({ organizationId: e.target.value })}
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </select>
  );
}
