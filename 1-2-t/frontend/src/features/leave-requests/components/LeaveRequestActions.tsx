import { useNavigate } from 'react-router-dom';
import { useSubmitLeaveRequest } from '../api/useSubmitLeaveRequest';
import { useCancelLeaveRequest } from '../api/useCancelLeaveRequest';
import type { LeaveRequestDetail, LeaveRequestListItem } from '../api/leaveRequestsApi';
import { getApiErrorMessage } from '../../../api/errorHandling';
import { useAuth } from '../../auth/authStore';

export function LeaveRequestActions({
  leaveRequest,
}: {
  leaveRequest: Pick<LeaveRequestListItem, 'id' | 'status'> | LeaveRequestDetail;
}) {
  const nav = useNavigate();
  const { user } = useAuth();
  const submit = useSubmitLeaveRequest();
  const cancel = useCancelLeaveRequest();

  const canSubmit = leaveRequest.status === 'draft';
  const canCancel =
    leaveRequest.status === 'submitted' &&
    !!(leaveRequest as LeaveRequestDetail).user?.id &&
    !!user?.id &&
    (leaveRequest as LeaveRequestDetail).user!.id === user.id;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canSubmit ? (
        <button
          className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          type="button"
          disabled={submit.isPending || cancel.isPending}
          onClick={async () => {
            await submit.mutateAsync(leaveRequest.id);
            nav(`/leave-requests/${leaveRequest.id}`, { replace: true });
          }}
        >
          {submit.isPending ? '送出中…' : '送出申請'}
        </button>
      ) : null}

      {canCancel ? (
        <button
          className="rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          type="button"
          disabled={submit.isPending || cancel.isPending}
          onClick={async () => {
            await cancel.mutateAsync(leaveRequest.id);
            nav(`/leave-requests/${leaveRequest.id}`, { replace: true });
          }}
        >
          {cancel.isPending ? '撤回中…' : '撤回（取消送出）'}
        </button>
      ) : null}

      {submit.isError ? (
        <div className="w-full rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {getApiErrorMessage(submit.error)}
        </div>
      ) : null}

      {cancel.isError ? (
        <div className="w-full rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {getApiErrorMessage(cancel.error)}
        </div>
      ) : null}
    </div>
  );
}
