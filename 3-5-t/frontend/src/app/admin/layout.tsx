import { getSession } from '../../lib/session';
import { Forbidden } from '../../components/states/Forbidden';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return <Forbidden />;
  }
  return <>{children}</>;
}
