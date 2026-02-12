import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const cookieStore = await cookies();
  const hasAccess = cookieStore.has('tl_access');
  redirect(hasAccess ? '/projects' : '/login');
}
