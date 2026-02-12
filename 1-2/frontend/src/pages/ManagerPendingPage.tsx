import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listPending } from '../features/manager/api';
import { useManagerApproveMutation, useManagerRejectMutation } from '../features/manager/mutations';
import { RejectDialog } from '../features/manager/RejectDialog';

export function ManagerPendingPage() {
    const q = useQuery({
        queryKey: ['manager', 'pending'],
        queryFn: () => listPending(),
    });

    const approve = useManagerApproveMutation();
    const reject = useManagerRejectMutation();

    const [rejectingId, setRejectingId] = useState<string | null>(null);

    const selected = useMemo(() => q.data?.find((x) => x.id === rejectingId) ?? null, [q.data, rejectingId]);

    return (
        <div>
            <h2>待審核</h2>
            {q.isLoading ? <div>Loading…</div> : null}
            {q.isError ? <div>Failed to load pending list</div> : null}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>員工</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>假別</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>期間</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>天數</th>
                        <th style={{ borderBottom: '1px solid #ddd' }}>操作</th>
                    </tr>
                </thead>
                <tbody>
                    {q.data?.map((r) => (
                        <tr key={r.id}>
                            <td style={{ padding: '8px 0' }}>
                                <Link to={`/manager/leave-requests/${r.id}`}>{r.employee.name}</Link>
                            </td>
                            <td>{r.leaveType.name}</td>
                            <td>
                                {r.startDate} ~ {r.endDate}
                            </td>
                            <td style={{ textAlign: 'right' }}>{r.days}</td>
                            <td style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '8px 0' }}>
                                <button disabled={approve.isPending} onClick={() => approve.mutate(r.id)}>
                                    {approve.isPending ? '處理中…' : '核准'}
                                </button>
                                <button disabled={reject.isPending} onClick={() => setRejectingId(r.id)}>
                                    退回
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <RejectDialog
                open={Boolean(rejectingId)}
                onClose={() => setRejectingId(null)}
                pending={reject.isPending}
                onConfirm={async (reason) => {
                    if (!selected) return;
                    await reject.mutateAsync({ id: selected.id, reason });
                    setRejectingId(null);
                }}
            />

            {approve.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>核准失敗</div> : null}
            {reject.isError ? <div style={{ color: 'crimson', marginTop: 8 }}>退回失敗</div> : null}
        </div>
    );
}
