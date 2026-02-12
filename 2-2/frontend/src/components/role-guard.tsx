'use client';

import { ReactNode, useEffect } from 'react';
import { useSession } from '../features/auth/use-session';

export function RoleGuard({
  roles,
  children,
}: {
  roles: Array<'student' | 'instructor' | 'admin'>;
  children: ReactNode;
}) {
  const { user } = useSession();

  useEffect(() => {
    if (!user) {
      const redirect = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?redirect=${redirect}`;
      return;
    }
    if (!roles.includes(user.role)) {
      window.location.href = '/403';
    }
  }, [user, roles]);

  if (!user || !roles.includes(user.role)) {
    return null;
  }
  return <>{children}</>;
}
