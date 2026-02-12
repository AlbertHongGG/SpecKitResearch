import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPending } from '../features/manager/api';
import { useManagerApproveMutation, useManagerRejectMutation } from '../features/manager/mutations';
import { RejectDialog } from '../features/manager/RejectDialog';

export function ManagerLeaveRequestDetailPage() {
    const { id } = useParams();
    const leaveRequestId = id ?? '';

    const q = useQuery({
        queryKey: ['manager', 'pending'],
        queryFn: () => listPending(),
    });

    const item = useMemo(() => q.data?.find((x) => x.id === leaveRequestId) ?? null, [q.data, leaveRequestId]);

    const approve = useManagerApproveMutation();
    const reject = useManagerRejectMutation();
    const [rejectOpen, setRejectOpen] = useState(false);

    if (q.isLoading) return <div>Loading…</div>;
    if (q.isError) return <div>Failed to load</div>;

    if (!item) {
        return (
            <div>
                <h2>請假詳情</h2>
                <p>此筆可能已不在待審清單（已處理或無權限）。</p>
                <Link to="/manager/pending">回待審清單</Link>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ marginRight: 'auto' }}>請假詳情（待審）</h2>
                <Link to="/manager/pending">回清單</Link>
            </div>

            <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                <div>員工：{item.employee.name}（{item.employee.department.name}）</div>
                <div>假別：{item.leaveType.name}</div>
                <div>期間：{item.startDate} ~ {item.endDate}（{item.days}）</div>
                <div>Submitted：{item.submittedAt}</div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
                <button disabled={approve.isPending} onClick={() => approve.mutate(item.id)}>
                    {approve.isPending ? '處理中…' : '核准'}
                </button>
                <button disabled={reject.isPending} onClick={() => setRejectOpen(true)}>
                    退回
                </button>
            </div>

            <RejectDialog
                open={rejectOpen}
                onClose={() => setRejectOpen(false)}
                pending={reject.isPending}
                onConfirm={async (reason) => {
                    await reject.mutateAsync({ id: item.id, reason });
                    setRejectOpen(false);
                }}
            />

            {approve.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>核准失敗</div> : null}
            {reject.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>退回失敗</div> : null}
        </div>
    );
}
