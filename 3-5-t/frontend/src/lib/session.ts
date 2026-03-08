import { cookies } from 'next/headers';
import { SessionResponseSchema, type Session } from './schemas';

function getBackendUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3001';
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
    .join('; ');

  const res = await fetch(new URL('/session', getBackendUrl()), {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = await res.json();
  const parsed = SessionResponseSchema.safeParse(data);
  if (!parsed.success) return null;
  if (!parsed.data.authenticated || !parsed.data.user) return null;
  return { user: parsed.data.user };
}
