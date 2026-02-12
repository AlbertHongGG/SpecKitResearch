import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listMyLeaveRequests } from '../features/leaveRequests/api';
import { LeaveRequestForm } from '../features/leaveRequests/LeaveRequestForm';
import { useSaveDraftMutation } from '../features/leaveRequests/mutations';

export function MyLeaveRequestsPage() {
    const [showNew, setShowNew] = useState(false);
    const q = useQuery({
        queryKey: ['me', 'leave-requests'],
        queryFn: () => listMyLeaveRequests({ sort: 'startDateDesc' }),
    });

    const saveDraft = useSaveDraftMutation();

    const now = useMemo(() => new Date().toISOString().slice(0, 10), []);

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h2 style={{ marginRight: 'auto' }}>我的請假</h2>
                <button onClick={() => setShowNew((v) => !v)}>{showNew ? '關閉' : '新增請假'}</button>
            </div>

            {showNew ? (
                <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                    <h3>新增草稿</h3>
                    <LeaveRequestForm
                        initial={{ startDate: now, endDate: now }}
                        saving={saveDraft.isPending}
                        onSave={async (values) => {
                            await saveDraft.mutateAsync({ input: values });
                            setShowNew(false);
                        }}
                    />
                    {saveDraft.isError ? <div style={{ color: 'crimson' }}>儲存失敗</div> : null}
                </div>
            ) : null}

            {q.isLoading ? <div>Loading…</div> : null}
            {q.isError ? <div>Failed to load leave requests</div> : null}

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>期間</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>假別</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>天數</th>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>狀態</th>
                    </tr>
                </thead>
                <tbody>
                    {q.data?.map((r) => (
                        <tr key={r.id}>
                            <td style={{ padding: '8px 0' }}>
                                <Link to={`/me/leave-requests/${r.id}`}>{r.startDate} ~ {r.endDate}</Link>
                            </td>
                            <td>{r.leaveType.name}</td>
                            <td style={{ textAlign: 'right' }}>{r.days}</td>
                            <td>{r.status}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
