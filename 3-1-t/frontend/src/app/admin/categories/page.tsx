'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/form/Button';
import { Input } from '@/components/ui/form/Input';
import { Select } from '@/components/ui/form/Select';
import { useRolePageGuard } from '@/lib/routing/useRolePageGuard';
import { adminCategoriesApi } from '@/services/admin/categories/api';

export default function AdminCategoriesPage() {
  const guard = useRolePageGuard('ADMIN');
  const { data, refetch } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: adminCategoriesApi.list,
  });
  const categories =
    (data as Array<{ id: string; name: string; status: string }> | undefined) ?? [];
  const [name, setName] = useState('');

  if (!guard.allowed) {
    return <main className="mx-auto max-w-5xl px-6 py-10">{guard.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Categories</h1>
      <form
        className="flex flex-wrap items-end gap-3 rounded border p-4"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!name.trim()) return;
          await adminCategoriesApi.create({ name: name.trim() });
          setName('');
          await refetch();
        }}
      >
        <div className="min-w-64 flex-1">
          <Input
            label="New Category Name"
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </div>
        <Button type="submit">Create Category</Button>
      </form>
      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="rounded border p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{category.name}</div>
                <div className="text-sm text-black/70">{category.status}</div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  label="Status"
                  onChange={async (event) => {
                    await adminCategoriesApi.update(category.id, {
                      status: event.target.value as 'ACTIVE' | 'INACTIVE',
                    });
                    await refetch();
                  }}
                  value={category.status}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </Select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
