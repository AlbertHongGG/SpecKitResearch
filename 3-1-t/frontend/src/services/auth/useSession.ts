'use client';

import { useQuery } from '@tanstack/react-query';

import { getSession } from './session';

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession,
    staleTime: 60_000,
  });
}
