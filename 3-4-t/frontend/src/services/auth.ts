import { useMutation, useQuery } from '@tanstack/react-query';
import { apiFetch } from './http';
import { queryClient } from './queryClient';

export type MeData =
  | { authenticated: false }
  | { authenticated: true; email: string; role: 'USER_DEVELOPER' | 'ADMIN' };

export function useMeQuery() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiFetch<MeData>('/api/auth/me')).data,
  });
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: async (values: { email: string; password: string }) =>
      (await apiFetch<MeData>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(values),
      })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: async () => (await apiFetch<MeData>('/api/auth/logout', { method: 'POST' })).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}
