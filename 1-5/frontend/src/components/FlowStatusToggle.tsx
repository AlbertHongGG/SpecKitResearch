import { useDeactivateAdminFlow, useUpsertAdminFlow, type AdminFlowTemplate } from '../services/adminFlows';
import { AsyncButton } from '../ui/AsyncButton';
import { useToast } from '../ui/toast';

export function FlowStatusToggle(props: { flow: AdminFlowTemplate }) {
  const deactivate = useDeactivateAdminFlow();
  const upsert = useUpsertAdminFlow();
  const toast = useToast();

  const busy = deactivate.isPending || upsert.isPending;

  return (
    <AsyncButton
      className={
        props.flow.isActive
          ? 'rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60'
          : 'rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60'
      }
      isLoading={busy}
      loadingText="處理中…"
      onClick={() => {
        if (props.flow.isActive) {
          deactivate.mutate(props.flow.id, {
            onSuccess: () => toast.success('已停用'),
            onError: () => toast.error('停用失敗'),
          });
          return;
        }
        upsert.mutate(
          {
            id: props.flow.id,
            name: props.flow.name,
            isActive: true,
            steps: props.flow.steps.map((s) => ({
              stepKey: s.stepKey,
              orderIndex: s.orderIndex,
              mode: s.mode,
              reviewerIds: s.assignees.map((a) => a.reviewerId),
            })),
          },
          {
            onSuccess: () => toast.success('已啟用'),
            onError: () => toast.error('啟用失敗'),
          },
        );
      }}
      type="button"
    >
      {props.flow.isActive ? 'Active' : 'Inactive'}
    </AsyncButton>
  );
}
