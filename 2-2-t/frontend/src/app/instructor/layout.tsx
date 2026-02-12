import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionOrNull } from '../../services/auth';

export const dynamic = 'force-dynamic';

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const cookie = (await cookies()).toString();
  const pathname = (await headers()).get('x-pathname') || '/instructor/courses';

  const session = await getSessionOrNull({ cookie });
  if (!session) redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
  if (session.user.role !== 'instructor' && session.user.role !== 'admin') redirect('/403');

  return <>{children}</>;
}
