'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useSession } from '@/services/auth/useSession';

import { requireAuthenticated, requireRole } from './guards';

export function useRolePageGuard(requiredRole: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, isLoading } = useSession();

  const isAuthenticated = Boolean(session?.user);
  const authentication = requireAuthenticated(isAuthenticated);
  const authorization = requireRole(session?.user?.roles, requiredRole);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!authentication.allowed) {
      router.replace(`${authentication.redirectTo}?returnTo=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!authorization.allowed) {
      router.replace(authorization.redirectTo);
    }
  }, [authentication, authorization, isLoading, pathname, router]);

  if (isLoading) {
    return {
      allowed: false,
      message: 'Loading access...',
    };
  }

  if (!authentication.allowed) {
    return {
      allowed: false,
      message: 'Redirecting to login...',
    };
  }

  if (!authorization.allowed) {
    return {
      allowed: false,
      message: 'Redirecting...',
    };
  }

  return {
    allowed: true,
    message: null,
  };
}
