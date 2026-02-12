import { useMemo } from 'react';
import { useMyBalances } from '../features/leaveBalances/useMyBalances';

export function MyBalancesPage() {
    const year = useMemo(() => new Date().getFullYear(), []);
    const q = useMyBalances(year);

    if (q.isLoading) return <div>Loading…</div>;
    if (q.isError) return <div>Failed to load balances</div>;

    return (
        <div>
            <h2>我的額度（{year}）</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd' }}>假別</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Quota</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Used</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Reserved</th>
                        <th style={{ textAlign: 'right', borderBottom: '1px solid #ddd' }}>Available</th>
                    </tr>
                </thead>
                <tbody>
                    {q.data?.map((b) => {
                        const available = b.quota - b.usedDays - b.reservedDays;
                        return (
                            <tr key={b.id}>
                                <td style={{ padding: '8px 0' }}>{b.leaveType.name}</td>
                                <td style={{ textAlign: 'right' }}>{b.quota}</td>
                                <td style={{ textAlign: 'right' }}>{b.usedDays}</td>
                                <td style={{ textAlign: 'right' }}>{b.reservedDays}</td>
                                <td style={{ textAlign: 'right' }}>{available}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
