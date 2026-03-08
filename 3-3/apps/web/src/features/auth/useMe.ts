'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export type OrganizationSummary = {
  id: string;
  name: string;
  memberRole: 'END_USER' | 'ORG_ADMIN';
};

export type MeResponse = {
  user: { id: string; email: string; isPlatformAdmin: boolean };
  organizations: OrganizationSummary[];
  currentOrganization: OrganizationSummary | null;
};

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiFetch<MeResponse>('/auth/me'),
  });
}
