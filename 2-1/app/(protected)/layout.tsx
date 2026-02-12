import { redirect } from 'next/navigation';

import ProtectedNavBar from '@/components/ProtectedNavBar';
import { currentUser } from '@/lib/auth/currentUser';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen">
      <ProtectedNavBar />
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
