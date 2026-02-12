'use client';

import { useEffect } from 'react';

import { useSession } from '@/features/auth/useSession';
import { sanitizeReturnTo } from '@/lib/routing/returnTo';
import { LoadingState } from '@/components/PageStates';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = useSession();

  useEffect(() => {
    if (session.isError) {
      const status = (session.error as any)?.status;
      if (status === 401) {
        const returnTo = sanitizeReturnTo(window.location.pathname + window.location.search);
        const qs = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : '';
        window.location.href = `/login${qs}`;
      }
    }
  }, [session.isError, session.error]);

  if (session.isLoading) return <LoadingState />;

  // If 401, effect will redirect. For other errors, let page handle.
  return <>{children}</>;
}
