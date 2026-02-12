'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { adminClient } from '@/services/adminClient';

export function TaxonomyManager({ categories, tags }: { categories: any[]; tags: any[] }) {
  const qc = useQueryClient();

  const createCategory = useMutation({
    mutationFn: (name: string) => adminClient.createCategory({ name }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });

  const createTag = useMutation({
    mutationFn: (name: string) => adminClient.createTag({ name }),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminClient.updateCategory(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'categories'] });
    },
  });

  const updateTag = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => adminClient.updateTag(id, body),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['admin', 'tags'] });
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">分類</h2>
          <Button
            type="button"
            onClick={() => {
              const name = window.prompt('新分類名稱')?.trim();
              if (!name) return;
              createCategory.mutate(name);
            }}
            disabled={createCategory.isPending}
          >
            新增
          </Button>
        </div>
        {createCategory.isError ? <InlineError message={(createCategory.error as any)?.message ?? '新增失敗'} /> : null}

        <ul className="mt-3 space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
              <div>
                <div className="font-medium text-slate-900">{c.name}</div>
                <div className="text-xs text-slate-500">{c.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => {
                    const name = window.prompt('新名稱', c.name)?.trim();
                    if (!name) return;
                    updateCategory.mutate({ id: c.id, body: { name } });
                  }}
                  disabled={updateCategory.isPending}
                >
                  改名
                </Button>
                <Button
                  type="button"
                  className={c.isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}
                  onClick={() => updateCategory.mutate({ id: c.id, body: { isActive: !c.isActive } })}
                  disabled={updateCategory.isPending}
                >
                  {c.isActive ? '停用' : '啟用'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">標籤</h2>
          <Button
            type="button"
            onClick={() => {
              const name = window.prompt('新標籤名稱')?.trim();
              if (!name) return;
              createTag.mutate(name);
            }}
            disabled={createTag.isPending}
          >
            新增
          </Button>
        </div>
        {createTag.isError ? <InlineError message={(createTag.error as any)?.message ?? '新增失敗'} /> : null}

        <ul className="mt-3 space-y-2">
          {tags.map((t) => (
            <li key={t.id} className="flex items-center justify-between rounded border border-slate-200 p-2">
              <div>
                <div className="font-medium text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">{t.id}</div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  className="bg-slate-700 hover:bg-slate-600"
                  onClick={() => {
                    const name = window.prompt('新名稱', t.name)?.trim();
                    if (!name) return;
                    updateTag.mutate({ id: t.id, body: { name } });
                  }}
                  disabled={updateTag.isPending}
                >
                  改名
                </Button>
                <Button
                  type="button"
                  className={t.isActive ? 'bg-red-600 hover:bg-red-500' : 'bg-slate-700 hover:bg-slate-600'}
                  onClick={() => updateTag.mutate({ id: t.id, body: { isActive: !t.isActive } })}
                  disabled={updateTag.isPending}
                >
                  {t.isActive ? '停用' : '啟用'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
