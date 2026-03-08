"use client";

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/http/client';
import { useSession } from '@/lib/auth/session-context';

export function useEntitlements() {
  const { organizationId } = useSession();
  return useQuery({
    queryKey: ['entitlements', organizationId],
    queryFn: () => apiFetch('/entitlements', {}, organizationId),
    enabled: Boolean(organizationId),
  });
}
