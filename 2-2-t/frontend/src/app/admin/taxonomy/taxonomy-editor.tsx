'use client';

import { useState } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { upsertCategory, upsertTag, type TaxonomyItem } from '../../../services/admin';

export function TaxonomyEditor({
  initialCategories,
  initialTags,
}: {
  initialCategories: TaxonomyItem[];
  initialTags: TaxonomyItem[];
}) {
  const [categories, setCategories] = useState<TaxonomyItem[]>(initialCategories);
  const [tags, setTags] = useState<TaxonomyItem[]>(initialTags);
  const [newCategory, setNewCategory] = useState('');
  const [newTag, setNewTag] = useState('');

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="text-sm font-semibold">分類</div>
        <div className="rounded-md border p-3 space-y-3">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCategory.trim()) return;
              const created = await upsertCategory({ name: newCategory.trim(), isActive: true });
              setCategories((prev) => [{ ...created }, ...prev]);
              setNewCategory('');
            }}
          >
            <Input label="新增分類" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} />
            <Button type="submit">新增</Button>
          </form>

          <div className="divide-y">
            {categories.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-600">{c.isActive ? '啟用' : '停用'}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const next = !c.isActive;
                    const updated = await upsertCategory({ id: c.id, name: c.name, isActive: next });
                    setCategories((prev) => prev.map((x) => (x.id === c.id ? updated : x)));
                  }}
                >
                  {c.isActive ? '停用' : '啟用'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm font-semibold">標籤</div>
        <div className="rounded-md border p-3 space-y-3">
          <form
            className="flex gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newTag.trim()) return;
              const created = await upsertTag({ name: newTag.trim(), isActive: true });
              setTags((prev) => [{ ...created }, ...prev]);
              setNewTag('');
            }}
          >
            <Input label="新增標籤" value={newTag} onChange={(e) => setNewTag(e.target.value)} />
            <Button type="submit">新增</Button>
          </form>

          <div className="divide-y">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-gray-600">{t.isActive ? '啟用' : '停用'}</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const next = !t.isActive;
                    const updated = await upsertTag({ id: t.id, name: t.name, isActive: next });
                    setTags((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
                  }}
                >
                  {t.isActive ? '停用' : '啟用'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
