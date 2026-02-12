import { apiFetch } from './client';

let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await apiFetch<{ csrfToken: string }>('/auth/csrf');
  cachedToken = res.csrfToken;
  return cachedToken;
}

export async function withCsrf(init?: RequestInit): Promise<RequestInit> {
  const token = await getCsrfToken();
  return {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      'X-CSRF-Token': token,
    },
  };
}

export function clearCsrfTokenCache() {
  cachedToken = null;
}
