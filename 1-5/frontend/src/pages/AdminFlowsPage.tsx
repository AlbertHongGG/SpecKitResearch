import { useMemo, useState } from 'react';

import { useAdminFlowsList, useAdminReviewers, useUpsertAdminFlow } from '../services/adminFlows';
import { LoadingState, ErrorState, EmptyState } from '../ui/states';
import { FlowStatusToggle } from '../components/FlowStatusToggle';
import { FlowEditor } from '../components/FlowEditor';
import { useToast } from '../ui/toast';

export function AdminFlowsPage() {
  const flows = useAdminFlowsList();
  const reviewers = useAdminReviewers();
  const upsert = useUpsertAdminFlow();
  const toast = useToast();

  const [editingId, setEditingId] = useState<string | 'new' | null>(null);

  const editing = useMemo(() => {
    if (!flows.data) return undefined;
    if (!editingId || editingId === 'new') return undefined;
    return flows.data.find((f) => f.id === editingId);
  }, [editingId, flows.data]);

  const isLoading = flows.isLoading || reviewers.isLoading;
  if (isLoading) return <LoadingState />;
  if (flows.isError || reviewers.isError) {
    return <ErrorState title="載入失敗">無法取得流程模板或 reviewer 清單。</ErrorState>;
  }

  const list = flows.data ?? [];
  const reviewerList = reviewers.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">流程模板</h1>
          <div className="mt-1 text-sm text-slate-600">管理送審流程的 steps、模式與指派 reviewer。</div>
        </div>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          onClick={() => setEditingId('new')}
          type="button"
        >
          + 新增模板
        </button>
      </div>

      {editingId ? (
        <FlowEditor
          reviewers={reviewerList}
          initial={editingId === 'new' ? undefined : editing}
          isSaving={upsert.isPending}
          onCancel={() => setEditingId(null)}
          onSave={(payload) => {
            upsert.mutate(payload, {
              onSuccess: () => {
                toast.success('模板已儲存');
                setEditingId(null);
              },
              onError: () => toast.error('儲存失敗'),
            });
          }}
        />
      ) : null}

      {list.length === 0 ? (
        <EmptyState title="尚無模板">點右上角新增第一個流程模板。</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <ul className="divide-y divide-slate-200">
            {list.map((f) => (
              <li key={f.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-900">{f.name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      更新：{new Date(f.updatedAt).toLocaleString()} · steps：{f.steps.length}
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      {f.steps
                        .slice()
                        .sort((a, b) => a.orderIndex - b.orderIndex)
                        .map((s) => `${s.stepKey}(${s.mode})[${s.assignees.length}]`)
                        .join(' → ')}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <FlowStatusToggle flow={f} />
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      onClick={() => setEditingId(f.id)}
                      type="button"
                    >
                      編輯
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
