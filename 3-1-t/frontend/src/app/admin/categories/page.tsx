'use client';

import { useQuery } from '@tanstack/react-query';

import { adminCategoriesApi } from '@/services/admin/categories/api';

export default function AdminCategoriesPage() {
  const { data } = useQuery({ queryKey: ['admin-categories'], queryFn: adminCategoriesApi.list });
  const categories =
    (data as Array<{ id: string; name: string; status: string }> | undefined) ?? [];

  return (
    <main className="mx-auto max-w-5xl space-y-4 px-6 py-10">
      <h1 className="text-2xl font-semibold">Admin Categories</h1>
      <ul className="space-y-2">
        {categories.map((category) => (
          <li key={category.id} className="rounded border p-3">
            {category.name} · {category.status}
          </li>
        ))}
      </ul>
    </main>
  );
}
