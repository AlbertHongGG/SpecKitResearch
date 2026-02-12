import { redirect } from 'next/navigation';

import { currentUser } from '@/lib/auth/currentUser';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'admin') {
    redirect('/403');
  }

  return <>{children}</>;
}
