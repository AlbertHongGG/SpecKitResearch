'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Select } from '@/components/ui/Select';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export function UsersTable({ users }: { users: any[] }) {
  const qc = useQueryClient();

  const m = useMutation({
    mutationFn: ({ userId, body }: { userId: string; body: any }) => adminClient.updateUser(userId, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: queryKeys.adminUsers() });
    },
  });

  return (
    <div>
      {m.isError ? <InlineError message={(m.error as any)?.message ?? '更新失敗'} /> : null}
      <div className="overflow-x-auto">
        <table className="mt-3 w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-700">
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Role</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2 pr-4">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <div className="font-medium text-slate-900">{u.email}</div>
                  <div className="text-xs text-slate-500">{u.id}</div>
                </td>
                <td className="py-2 pr-4">
                  <Select defaultValue={u.role} onChange={(e) => m.mutate({ userId: u.id, body: { role: e.target.value } })}>
                    <option value="student">student</option>
                    <option value="instructor">instructor</option>
                    <option value="admin">admin</option>
                  </Select>
                </td>
                <td className="py-2 pr-4">
                  <span className={u.isActive ? 'text-green-700' : 'text-red-700'}>{u.isActive ? '啟用' : '停用'}</span>
                </td>
                <td className="py-2 pr-4">
                  <Button
                    type="button"
                    className={u.isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}
                    onClick={() => {
                      const next = !u.isActive;
                      if (!next && !window.confirm('停用後會撤銷所有 session，確定？')) return;
                      m.mutate({ userId: u.id, body: { isActive: next } });
                    }}
                    disabled={m.isPending}
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
