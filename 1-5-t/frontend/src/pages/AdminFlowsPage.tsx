import { useMutation, useQuery } from '@tanstack/react-query';
import type { FlowTemplate, UpsertFlowTemplateRequest } from '@internal/contracts';
import { adminApi } from '../api/admin';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/status/ErrorState';
import { EmptyState } from '../components/status/EmptyState';
import { FlowTemplateEditor } from '../components/admin/FlowTemplateEditor';
import { useState } from 'react';
import { useToast } from '../components/toast/ToastContext';

export function AdminFlowsPage() {
  const toast = useToast();
  const query = useQuery({
    queryKey: ['admin', 'flows'],
    queryFn: () => adminApi.listFlows(),
  });

  const [editing, setEditing] = useState<null | { mode: 'create' } | { mode: 'edit'; template: FlowTemplate }>(
    null,
  );

  const createMutation = useMutation({
    mutationFn: (body: UpsertFlowTemplateRequest) => adminApi.createFlow(body),
    onSuccess: async () => {
      await query.refetch();
      setEditing(null);
      toast.success('模板已建立');
    },
    onError: (e) => {
      toast.error('建立失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (params: { templateId: string; body: UpsertFlowTemplateRequest }) =>
      adminApi.updateFlow(params.templateId, params.body),
    onSuccess: async () => {
      await query.refetch();
      setEditing(null);
      toast.success('模板已更新');
    },
    onError: (e) => {
      toast.error('更新失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (templateId: string) => adminApi.deactivateFlow(templateId),
    onSuccess: async () => {
      await query.refetch();
      toast.info('模板已停用');
    },
    onError: (e) => {
      toast.error('停用失敗', e instanceof Error ? e.message : '請稍後再試');
    },
  });

  if (query.isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (query.error) {
    return <ErrorState title="載入流程模板失敗" error={query.error} />;
  }

  const items = query.data?.templates ?? [];

  const isEditing = Boolean(editing);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">流程模板</h1>
        <Button disabled={isEditing} onClick={() => setEditing({ mode: 'create' })}>
          新增模板
        </Button>
      </div>

      {items.length === 0 ? (
        <EmptyState title="尚無模板" description="先建立一個模板，User 才能送審。" />
      ) : (
        <div className="mt-4 divide-y rounded-lg border border-slate-200 bg-white">
          {items.map((t) => (
            <div key={t.id} className="p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-900">{t.name}</div>
                <div className="text-xs text-slate-500">
                  {t.isActive ? 'Active' : 'Inactive'} · updated {new Date(t.updatedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setEditing({ mode: 'edit', template: t })}>
                  編輯
                </Button>
                <Button
                  variant="secondary"
                  loading={deactivateMutation.isPending}
                  disabled={!t.isActive}
                  onClick={() => deactivateMutation.mutate(t.id)}
                >
                  停用
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing ? (
        <FlowTemplateEditor
          submitLabel={editing.mode === 'create' ? '建立' : '更新'}
          initial={
            editing.mode === 'create'
              ? { name: '新模板', isActive: true, steps: [{ stepKey: 's1', orderIndex: 0, mode: 'Parallel', assigneeIds: [] }] }
              : {
                  name: editing.template.name,
                  isActive: editing.template.isActive,
                  steps: editing.template.steps,
                }
          }
          onCancel={() => setEditing(null)}
          onSubmit={async (body) => {
            if (editing.mode === 'create') {
              await createMutation.mutateAsync(body);
              return;
            }
            await updateMutation.mutateAsync({ templateId: editing.template.id, body });
          }}
        />
      ) : null}
    </div>
  );
}
