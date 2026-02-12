'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
};

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      return await apiFetch<{ user: SessionUser }>('/auth/me');
    },
    retry: false,
  });
}
