'use client';

import { RoleGuard } from '../../../components/role-guard';
import { useUsers, useUpdateUser } from '../../../features/admin/api';
import { LoadingState, ErrorState } from '../../../features/courses/components/states';

function UserRow({ user }: { user: any }) {
  const update = useUpdateUser(user.id);
  return (
    <div className="flex items-center justify-between rounded border bg-white p-3">
      <div>
        <div className="font-medium">{user.email}</div>
        <div className="text-sm text-slate-600">角色：{user.role}</div>
      </div>
      <div className="space-x-2">
        <button
          className="rounded bg-gray-700 px-3 py-1 text-white"
          onClick={() => update.mutate({ isActive: !user.isActive })}
        >
          {user.isActive ? '停用' : '啟用'}
        </button>
        <select
          className="rounded border px-2 py-1"
          value={user.role}
          onChange={(e) => update.mutate({ role: e.target.value })}
        >
          <option value="student">student</option>
          <option value="instructor">instructor</option>
          <option value="admin">admin</option>
        </select>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { data, isLoading, error } = useUsers();

  return (
    <RoleGuard roles={['admin']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">使用者管理</h1>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        <div className="space-y-2">
          {data?.items?.map((user: any) => (
            <UserRow key={user.id} user={user} />
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
