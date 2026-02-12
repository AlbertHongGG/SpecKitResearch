'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../lib/apiClient';

export type SessionApiResponse = {
  session: {
    userId: string;
    role: 'student' | 'instructor' | 'admin';
    issuedAt: string;
    expiresAt: string;
  } | null;
};

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => apiFetch<SessionApiResponse>('/api/auth/session'),
    staleTime: 30_000,
  });
}
