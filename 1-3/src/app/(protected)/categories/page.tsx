'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { useCategories } from '@/lib/shared/hooks/useCategories';
import { useCreateCategory, useUpdateCategory } from '@/lib/shared/hooks/useCategoryMutations';
import { CategoryList } from '@/components/categories/CategoryList';
import { CreateCategoryDialog } from '@/components/categories/CreateCategoryDialog';
import { EditCategoryDialog } from '@/components/categories/EditCategoryDialog';

export default function CategoriesPage() {
  const { data: categories, isLoading, error } = useCategories();
  const create = useCreateCategory();
  const update = useUpdateCategory();

  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingCategory = useMemo(
    () => (categories ?? []).find((c) => c.id === editingId) ?? null,
    [categories, editingId],
  );

  const active = useMemo(() => (categories ?? []).filter((c) => c.isActive), [categories]);
  const inactive = useMemo(() => (categories ?? []).filter((c) => !c.isActive), [categories]);

  async function onToggle(id: string, isActive: boolean) {
    await update.mutateAsync({ id, patch: { isActive: !isActive } });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">類別管理</h1>
            <Button onClick={() => setCreateOpen(true)}>新增類別</Button>
          </div>
        </CardHeader>
        <CardContent>
          <CreateCategoryDialog
            open={createOpen}
            creating={create.isPending}
            onClose={() => setCreateOpen(false)}
            onCreate={async (input) => {
              await create.mutateAsync(input);
              setCreateOpen(false);
            }}
          />

          <EditCategoryDialog
            open={!!editingCategory}
            category={editingCategory}
            saving={update.isPending}
            onClose={() => setEditingId(null)}
            onSave={async (patch) => {
              if (!editingCategory) return;
              await update.mutateAsync({ id: editingCategory.id, patch });
              setEditingId(null);
            }}
          />

          {create.error ? (
            <Alert className="mt-4 border-red-200 bg-red-50 text-red-700">{(create.error as any).message ?? '新增失敗'}</Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">啟用中</h2>
        </CardHeader>
        <CardContent>
          {isLoading ? <p className="text-sm text-neutral-600">載入中…</p> : null}
          {error ? <Alert className="border-red-200 bg-red-50 text-red-700">{(error as any).message ?? '載入失敗'}</Alert> : null}

          <CategoryList
            title="啟用中"
            categories={active}
            onEdit={(c) => setEditingId(c.id)}
            onToggle={(c) => onToggle(c.id, c.isActive)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">已停用</h2>
        </CardHeader>
        <CardContent>
          {inactive.length === 0 ? <Alert>沒有停用的類別。</Alert> : null}

          {inactive.length > 0 ? (
            <CategoryList
              title="已停用"
              categories={inactive}
              onEdit={(c) => setEditingId(c.id)}
              onToggle={(c) => onToggle(c.id, c.isActive)}
            />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
