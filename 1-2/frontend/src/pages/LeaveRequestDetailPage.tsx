import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyLeaveRequest } from '../features/leaveRequests/api';
import { useCancelMutation, useSubmitMutation } from '../features/leaveRequests/mutations';

export function LeaveRequestDetailPage() {
    const { id } = useParams();
    const leaveRequestId = id ?? '';

    const q = useQuery({
        queryKey: ['me', 'leave-requests', leaveRequestId],
        queryFn: () => getMyLeaveRequest(leaveRequestId),
        enabled: Boolean(leaveRequestId),
    });

    const submit = useSubmitMutation();
    const cancel = useCancelMutation();

    const canSubmit = q.data?.status === 'draft';
    const canCancel = q.data?.status === 'submitted';

    const attachmentHref = useMemo(() => {
        if (!q.data?.attachment) return null;
        return `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'}/attachments/${q.data.attachment.id}/download`;
    }, [q.data?.attachment]);

    if (q.isLoading) return <div>Loading…</div>;
    if (q.isError || !q.data) return <div>Not found</div>;

    return (
        <div>
            <h2>請假詳情</h2>
            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <div>假別：{q.data.leaveType.name}</div>
                <div>期間：{q.data.startDate} ~ {q.data.endDate}（{q.data.days}）</div>
                <div>狀態：{q.data.status}</div>
                <div>原因：{q.data.reason ?? '-'}</div>
                <div>
                    附件：
                    {q.data.attachment ? (
                        <a href={attachmentHref ?? '#'} target="_blank" rel="noreferrer">
                            {q.data.attachment.originalFilename}
                        </a>
                    ) : (
                        '-'
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button disabled={!canSubmit || submit.isPending} onClick={() => submit.mutate(leaveRequestId)}>
                    {submit.isPending ? '送出中…' : '送出'}
                </button>
                <button disabled={!canCancel || cancel.isPending} onClick={() => cancel.mutate(leaveRequestId)}>
                    {cancel.isPending ? '撤回中…' : '撤回'}
                </button>
            </div>

            {submit.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>送出失敗</div> : null}
            {cancel.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>撤回失敗</div> : null}
        </div>
    );
}
