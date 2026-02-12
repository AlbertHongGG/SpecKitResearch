import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';

import { getServerCurrentUser } from '../../src/server/session/getServerCurrentUser';

export default async function InstructorLayout({ children }: { children: ReactNode }) {
  const user = await getServerCurrentUser();
  if (!user) redirect('/unauthorized');
  if (user.role !== 'instructor' && user.role !== 'admin') redirect('/forbidden');

  return <>{children}</>;
}
