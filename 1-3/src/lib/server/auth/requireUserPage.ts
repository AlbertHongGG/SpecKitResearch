import { redirect } from 'next/navigation';
import { getUserIdFromServerCookies } from '@/lib/server/auth/session';

export async function requireUserPage() {
  const userId = await getUserIdFromServerCookies();
  if (!userId) redirect('/login');
  return userId;
}
