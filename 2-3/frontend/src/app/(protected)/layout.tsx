import { cookies } from 'next/headers';

import Header from '@/components/header/Header';
import { getSessionFromCookieHeader } from '@/lib/auth/session';

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join('; ');
  const session = await getSessionFromCookieHeader(cookieHeader);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-100">
      <Header session={session} />
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
