'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';
import type { OrganizationSummary } from '../auth/useMe';

export function useSetActiveOrg() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      return apiFetch<OrganizationSummary>('/orgs/active', {
        method: 'PUT',
        body: JSON.stringify({ organizationId }),
      });
    },
    onSuccess: async (_data, organizationId) => {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem('activeOrgId', organizationId);
        } catch {
          // ignore
        }
      }
      await qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
