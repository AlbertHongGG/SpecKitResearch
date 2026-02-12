'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

import { useSession } from '../../src/features/auth/useSession';

export default function SurveysLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();

  useEffect(() => {
    if (session.isLoading) return;
    if (!session.data?.authenticated) {
      const returnTo = pathname || '/surveys';
      router.replace(`/login?return_to=${encodeURIComponent(returnTo)}`);
    }
  }, [session.isLoading, session.data?.authenticated, pathname, router]);

  if (session.isLoading) {
    return <main className="p-6">Loading…</main>;
  }

  if (!session.data?.authenticated) {
    return <main className="p-6">Redirecting to login…</main>;
  }

  return <>{children}</>;
}
