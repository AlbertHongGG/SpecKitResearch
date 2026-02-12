import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../../../api/http';
import { getApiErrorMessage } from '../../../api/errorHandling';
import type { LeaveRequestDetail } from '../api/leaveRequestsApi';
import { LeaveRequestActions } from '../components/LeaveRequestActions';
import { useAuth } from '../../auth/authStore';
import { ApproverDecisionPanel } from '../components/ApproverDecisionPanel';

export function LeaveRequestDetailPage() {
  const { user } = useAuth();
  const { id } = useParams();
  if (!id) throw new Error('Missing id');

  const q = useQuery({
    queryKey: ['leave-request', id],
    queryFn: async () => apiRequest<LeaveRequestDetail>(`/leave-requests/${id}`),
  });

  if (q.isLoading) return <div className="p-6 text-sm text-slate-600">載入中…</div>;
  if (q.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(q.error)}</div>;

  const lr = q.data;
  if (!lr) return <div className="p-6 text-sm text-slate-600">No data</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">請假詳情</h1>
          <div className="mt-1 text-sm text-slate-600">狀態：{lr.status}</div>
        </div>

        {lr.status === 'draft' ? (
          <Link
            to={`/leave-requests/${lr.id}/edit`}
            className="rounded border bg-white px-3 py-2 text-sm font-medium"
          >
            編輯草稿
          </Link>
        ) : null}
      </div>

      <div className="grid gap-3 rounded border bg-white p-4">
        <div className="text-sm">
          <span className="font-medium">假別：</span>
          {lr.leave_type.name}
        </div>
        <div className="text-sm">
          <span className="font-medium">區間：</span>
          {lr.start_date} ~ {lr.end_date}（{lr.days} 天）
        </div>
        <div className="text-sm">
          <span className="font-medium">原因：</span>
          {lr.reason}
        </div>
        {lr.attachment_url ? (
          <div className="text-sm">
            <span className="font-medium">附件：</span>
            <a className="text-blue-700 underline" href={lr.attachment_url} target="_blank" rel="noreferrer">
              下載
            </a>
          </div>
        ) : null}
        {lr.rejection_reason ? (
          <div className="text-sm text-red-700">
            <span className="font-medium">駁回原因：</span>
            {lr.rejection_reason}
          </div>
        ) : null}
      </div>

      <LeaveRequestActions leaveRequest={lr} />

      {user?.role === 'manager' && lr.status === 'submitted' ? (
        <ApproverDecisionPanel leaveRequestId={lr.id} />
      ) : null}
    </div>
  );
}
