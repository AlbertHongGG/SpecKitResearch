import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionOrNull } from '../../services/auth';

export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const cookie = (await cookies()).toString();
  const pathname = (await headers()).get('x-pathname') || '/';

  const session = await getSessionOrNull({ cookie });
  if (!session) redirect(`/login?redirect=${encodeURIComponent(pathname)}`);

  return <>{children}</>;
}
