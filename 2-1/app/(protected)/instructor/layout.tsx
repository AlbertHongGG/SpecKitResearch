import { redirect } from 'next/navigation';

import { currentUser } from '@/lib/auth/currentUser';

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    redirect('/login');
  }
  if (user.role !== 'instructor' && user.role !== 'admin') {
    redirect('/403');
  }

  return <>{children}</>;
}
