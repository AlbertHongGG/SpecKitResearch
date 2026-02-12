import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { AsyncState } from '../components/AsyncState';
import {
  createCategory,
  listCategories,
  type Category,
  updateCategory,
} from '../services/categories';
import { toUserFacingMessage } from '../services/apiErrors';
import { CategoryUpsertDialog } from '../components/categories/CategoryUpsertDialog';
import { CategoryActiveToggle } from '../components/categories/CategoryActiveToggle';

const categoriesQueryKey = ['categories', { includeInactive: true }] as const;

function typeLabel(type: Category['type']) {
  if (type === 'income') return '收入';
  if (type === 'expense') return '支出';
  return '兩者皆可';
}

export function CategoriesPage() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const categoriesQuery = useQuery({
    queryKey: categoriesQueryKey,
    queryFn: () => listCategories({ includeInactive: true }),
  });

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateCategory,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: categoriesQueryKey });
    },
  });

  const errorMessage = useMemo(() => {
    if (categoriesQuery.error) return toUserFacingMessage(categoriesQuery.error);
    return null;
  }, [categoriesQuery.error]);

  const isLoading = categoriesQuery.isLoading;
  const items = categoriesQuery.data?.items ?? [];
  const isEmpty = !isLoading && !errorMessage && items.length === 0;

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">類別</h1>
        <button
          type="button"
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => setCreateOpen(true)}
        >
          新增類別
        </button>
      </header>

      <div className="rounded border bg-white">
        <AsyncState
          isLoading={isLoading}
          error={errorMessage}
          onRetry={() => {
            categoriesQuery.refetch();
          }}
          isEmpty={isEmpty}
          empty={<p>目前沒有任何類別。</p>}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b bg-slate-50 text-xs text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-medium">名稱</th>
                  <th className="px-4 py-3 font-medium">類型</th>
                  <th className="px-4 py-3 font-medium">狀態</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b last:border-b-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{c.name}</span>
                        {c.isDefault ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                            預設
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{typeLabel(c.type)}</td>
                    <td className="px-4 py-3">
                      <CategoryActiveToggle category={c} queryKey={categoriesQueryKey} />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        onClick={() => setEditing(c)}
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </div>

      <CategoryUpsertDialog
        open={createOpen}
        mode="create"
        onClose={() => setCreateOpen(false)}
        submitting={createMutation.isPending}
        onSubmit={async (input) => {
          await createMutation.mutateAsync(input);
        }}
      />

      <CategoryUpsertDialog
        open={!!editing}
        mode="edit"
        category={editing}
        onClose={() => setEditing(null)}
        submitting={updateMutation.isPending}
        onSubmit={async (input) => {
          if (!editing) return;
          await updateMutation.mutateAsync({ categoryId: editing.id, ...input });
        }}
      />
    </section>
  );
}
