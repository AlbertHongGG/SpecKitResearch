'use client';

import type { CategoryDto } from '@/lib/shared/hooks/useCategories';
import { Button } from '@/components/ui/Button';

export function CategoryList({
  title,
  categories,
  onEdit,
  onToggle,
}: {
  title: string;
  categories: CategoryDto[];
  onEdit: (c: CategoryDto) => void;
  onToggle: (c: CategoryDto) => void;
}) {
  return (
    <section className="rounded-md border border-neutral-200">
      <div className="border-b border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-semibold">{title}</div>
      <ul className="divide-y divide-neutral-200">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 px-3 py-3">
            <div>
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-neutral-600">
                {c.isDefault ? '預設' : '自訂'} / {c.type} / {c.isActive ? '啟用' : '停用'}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onEdit(c)}>
                編輯
              </Button>
              <Button type="button" variant="secondary" onClick={() => onToggle(c)}>
                {c.isActive ? '停用' : '啟用'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
