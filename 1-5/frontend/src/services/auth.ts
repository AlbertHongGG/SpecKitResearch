import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, isUnauthorizedError } from './apiClient';

export type Role = 'User' | 'Reviewer' | 'Admin';

export type UserMe = {
  id: string;
  email: string;
  role: Role;
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiFetch<UserMe>('/auth/me');
      } catch (err) {
        if (isUnauthorizedError(err)) return null;
        throw err;
      }
    },
    retry: false,
    staleTime: 15_000,
  });
}

export function useAuthActions() {
  const qc = useQueryClient();

  return {
    async login(email: string, password: string) {
      await apiFetch<UserMe>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      await qc.invalidateQueries({ queryKey: ['me'] });
    },

    async logout() {
      await apiFetch<{ ok: true }>('/auth/logout', { method: 'POST' });
      await qc.invalidateQueries({ queryKey: ['me'] });
    },
  };
}
