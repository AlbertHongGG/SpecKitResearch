import { getFrontendEnv } from '@/lib/env';

export type SessionUser = {
  user_id: string;
  email: string;
  role: 'developer' | 'admin';
  status: 'active' | 'disabled';
  created_at: string;
};

async function fetchMe(cookieHeader?: string): Promise<Response> {
  const env = getFrontendEnv();

  return fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/me`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {})
    }
  });
}

export async function getSessionFromCookieHeader(cookieHeader: string | null | undefined): Promise<SessionUser | null> {
  const res = await fetchMe(cookieHeader ?? undefined);

  if (res.status === 401) return null;

  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    return null;
  }

  return body as SessionUser;
}
