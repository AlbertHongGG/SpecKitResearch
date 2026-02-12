import type { ReactNode } from 'react';
import { requireUserPage } from '@/lib/server/auth/requireUserPage';
import { TopNav } from '@/components/nav/TopNav';

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireUserPage();

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
