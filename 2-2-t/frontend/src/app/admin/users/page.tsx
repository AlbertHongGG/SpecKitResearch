import { cookies } from 'next/headers';
import { listUsers } from '../../../services/admin';
import { UsersTable } from './users-table';

export const dynamic = 'force-dynamic';

export default async function AdminUsersPage() {
  const cookie = (await cookies()).toString();
  const data = await listUsers({ cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">使用者管理</h1>
      </div>
      <UsersTable initialItems={data.items} />
    </div>
  );
}
