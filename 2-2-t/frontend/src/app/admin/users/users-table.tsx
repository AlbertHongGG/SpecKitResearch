'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { setUserActive, setUserRole, type AdminUserItem } from '../../../services/admin';

export function UsersTable({ initialItems }: { initialItems: AdminUserItem[] }) {
  const [items, setItems] = useState<AdminUserItem[]>(initialItems);

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="p-3">Email</th>
            <th className="p-3">角色</th>
            <th className="p-3">狀態</th>
            <th className="p-3">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {items.map((u) => (
            <tr key={u.id}>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.role}</td>
              <td className="p-3">{u.isActive ? '啟用' : '停用'}</td>
              <td className="p-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const next = !u.isActive;
                      await setUserActive(u.id, next);
                      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, isActive: next } : x)));
                    }}
                  >
                    {u.isActive ? '停用' : '啟用'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      const next = u.role === 'student' ? 'instructor' : u.role === 'instructor' ? 'admin' : 'student';
                      await setUserRole(u.id, next);
                      setItems((prev) => prev.map((x) => (x.id === u.id ? { ...x, role: next } : x)));
                    }}
                  >
                    切換角色
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
