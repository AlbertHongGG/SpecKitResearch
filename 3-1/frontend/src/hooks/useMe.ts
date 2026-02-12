'use client';

import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../services/apiClient';

export type Me = {
  id: string;
  email: string;
  roles: Array<'buyer' | 'seller' | 'admin'>;
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<Me>('/api/auth/me'),
    retry: false,
  });
}

export async function logout() {
  await apiFetch<{ ok: true }>('/api/auth/logout', { method: 'POST' });
}
