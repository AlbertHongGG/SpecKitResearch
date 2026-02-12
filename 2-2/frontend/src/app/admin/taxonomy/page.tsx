'use client';

import { useState } from 'react';
import { RoleGuard } from '../../../components/role-guard';
import { useCategories, useTags, useCreateCategory, useCreateTag } from '../../../features/admin/api';
import { LoadingState, ErrorState } from '../../../features/courses/components/states';

export default function AdminTaxonomyPage() {
  const { data: categories, isLoading: loadingCategories, error: errorCategories } = useCategories();
  const { data: tags, isLoading: loadingTags, error: errorTags } = useTags();
  const createCategory = useCreateCategory();
  const createTag = useCreateTag();
  const [categoryName, setCategoryName] = useState('');
  const [tagName, setTagName] = useState('');

  return (
    <RoleGuard roles={['admin']}>
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">分類與標籤</h1>
        {(loadingCategories || loadingTags) && <LoadingState />}
        {(errorCategories || errorTags) && <ErrorState message="載入失敗" />}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded border bg-white p-4 space-y-3">
            <h2 className="font-medium">分類</h2>
            <div className="space-y-2">
              {categories?.items?.map((item: any) => (
                <div key={item.id} className="text-sm">
                  {item.name} ({item.isActive ? '啟用' : '停用'})
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="分類名稱"
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1 text-white"
                onClick={() => createCategory.mutate({ name: categoryName, isActive: true })}
              >
                新增分類
              </button>
            </div>
          </div>
          <div className="rounded border bg-white p-4 space-y-3">
            <h2 className="font-medium">標籤</h2>
            <div className="space-y-2">
              {tags?.items?.map((item: any) => (
                <div key={item.id} className="text-sm">
                  {item.name} ({item.isActive ? '啟用' : '停用'})
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <input
                className="w-full rounded border px-3 py-2"
                placeholder="標籤名稱"
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
              />
              <button
                className="rounded bg-blue-600 px-3 py-1 text-white"
                onClick={() => createTag.mutate({ name: tagName, isActive: true })}
              >
                新增標籤
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
