'use client';

import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState } from '../../../src/ui/components/States';
import { Select } from '../../../src/ui/components/Select';
import { Button } from '../../../src/ui/components/Button';
import { useToast } from '../../../src/ui/components/Toast';
import { useSingleFlight } from '../../../src/ui/lib/mutations';

type UserRow = { id: string; email: string; role: 'student' | 'instructor' | 'admin'; isActive: boolean; createdAt: string };
type Resp = { users: UserRow[] };

export default function AdminUsersPage() {
  const toast = useToast();
  const { busy, run } = useSingleFlight();
  const q = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch<Resp>('/api/admin/users'),
  });

  async function updateUser(payload: { id: string; role?: UserRow['role']; isActive?: boolean }) {
    await run(async () => {
      try {
        await apiFetch('/api/admin/users', { method: 'PATCH', body: JSON.stringify(payload) });
        toast.success('已更新使用者');
        await q.refetch();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : '更新使用者失敗');
      }
    });
  }

  if (q.isLoading) return <LoadingState />;
  if (q.isError)
    return <ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} />;

  const users = q.data?.users ?? [];

  return (
    <div>
      <h1 className="text-xl font-semibold">使用者管理</h1>
      <div className="mt-4 overflow-x-auto rounded border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs text-slate-600">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">角色</th>
              <th className="px-3 py-2">啟用</th>
              <th className="px-3 py-2">建立時間</th>
              <th className="px-3 py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">
                  <Select
                    value={u.role}
                    disabled={busy}
                    onChange={(e) => void updateUser({ id: u.id, role: e.target.value as UserRow['role'] })}
                  >
                    <option value="student">student</option>
                    <option value="instructor">instructor</option>
                    <option value="admin">admin</option>
                  </Select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={u.isActive}
                    disabled={busy}
                    onChange={(e) => void updateUser({ id: u.id, isActive: e.target.checked })}
                  />
                </td>
                <td className="px-3 py-2 text-xs text-slate-600">{u.createdAt}</td>
                <td className="px-3 py-2">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => void updateUser({ id: u.id, isActive: !u.isActive })}
                  >
                    {u.isActive ? '停用' : '啟用'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
