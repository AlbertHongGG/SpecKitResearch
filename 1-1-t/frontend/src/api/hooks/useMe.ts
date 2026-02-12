import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../httpClient';
import type { MeResponse } from '../types';

export function useMe(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['me'],
    enabled: options?.enabled ?? true,
    queryFn: () => apiFetch<MeResponse>('/me'),
  });
}
