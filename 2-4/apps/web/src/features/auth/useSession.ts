'use client';

import { useQuery } from '@tanstack/react-query';
import { SessionResponseSchema } from '@acme/contracts';

import { apiFetch } from '../../lib/apiClient';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const data = await apiFetch<unknown>('/auth/session');
      return SessionResponseSchema.parse(data);
    },
    staleTime: 10_000,
    retry: false,
  });
}
