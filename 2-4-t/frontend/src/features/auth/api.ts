'use client';

import { useQuery } from '@tanstack/react-query';
import { LoginRequestSchema, LoginResponseSchema, SessionSchema } from '@app/contracts';
import { apiFetchJson } from '@/lib/api/client';

export async function getSession() {
  const data = await apiFetchJson<unknown>('/session');
  return SessionSchema.parse(data);
}

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: getSession
  });
}

export async function login(input: unknown) {
  const req = LoginRequestSchema.parse(input);
  const data = await apiFetchJson<unknown>('/login', {
    method: 'POST',
    body: JSON.stringify(req)
  });
  return LoginResponseSchema.parse(data);
}

export async function logout(csrfToken: string) {
  const data = await apiFetchJson<{ ok: boolean }>('/logout', {
    method: 'POST'
  }, { csrfToken });
  return data;
}
