'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ApiError, apiFetch } from './api-client';

export type MeResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
  };
};

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch<MeResponse>('/auth/me', { method: 'GET' });
      return res.data as MeResponse;
    },
  });
}

export function useRequireAuth() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const me = useMe();

  useEffect(() => {
    const err = me.error;
    if (!err) return;
    if (err instanceof ApiError && err.statusCode === 401) {
      const qs = search.toString();
      const next = `${pathname}${qs ? `?${qs}` : ''}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [me.error, pathname, router, search]);

  return me;
}
