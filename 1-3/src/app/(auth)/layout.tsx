import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUserIdFromServerCookies } from '@/lib/server/auth/session';

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const userId = await getUserIdFromServerCookies();
  if (userId) redirect('/transactions');

  return (
    <div className="min-h-screen bg-neutral-50">
      <main className="mx-auto max-w-md px-4 py-10">{children}</main>
    </div>
  );
}
