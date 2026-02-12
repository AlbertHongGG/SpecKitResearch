import { Link } from 'react-router-dom';
import { usePendingApprovals } from '../api/usePendingApprovals';
import { getApiErrorMessage } from '../../../api/errorHandling';
import { useLeaveTypes } from '../../leave-requests/api/useLeaveTypes';
import { PendingApprovalsFilters, type PendingApprovalsFilterValues } from '../components/PendingApprovalsFilters';
import { useMemo, useState } from 'react';

export function PendingApprovalsPage() {
  const leaveTypes = useLeaveTypes();
  const q = usePendingApprovals();

  const [filters, setFilters] = useState<PendingApprovalsFilterValues>({
    employeeName: '',
    leaveTypeId: '',
    start: '',
    end: '',
  });

  const items = useMemo(() => {
    const rows = q.data ?? [];
    return rows.filter((it) => {
      if (filters.employeeName) {
        const name = it.user.name.toLowerCase();
        if (!name.includes(filters.employeeName.toLowerCase())) return false;
      }
      if (filters.leaveTypeId && it.leave_type.id !== filters.leaveTypeId) return false;
      if (filters.start && it.start_date < filters.start) return false;
      if (filters.end && it.end_date > filters.end) return false;
      return true;
    });
  }, [q.data, filters]);

  if (leaveTypes.isLoading || q.isLoading) return <div className="p-6 text-sm text-slate-600">載入待審中…</div>;
  if (leaveTypes.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(leaveTypes.error)}</div>;
  if (q.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(q.error)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">待審清單</h1>
          <p className="mt-1 text-sm text-slate-600">顯示你直屬部屬的 submitted 申請。</p>
        </div>
        <button className="rounded border bg-white px-3 py-2 text-sm" type="button" onClick={() => q.refetch()}>
          重新整理
        </button>
      </div>

      <PendingApprovalsFilters leaveTypes={leaveTypes.data ?? []} value={filters} onChange={setFilters} />

      {items.length === 0 ? (
        <div className="rounded border bg-white p-6 text-sm text-slate-600">目前沒有待審申請。</div>
      ) : (
        <div className="overflow-hidden rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">員工</th>
                <th className="px-3 py-2">假別</th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">天數</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-3 py-2">{it.user.name}</td>
                  <td className="px-3 py-2">{it.leave_type.name}</td>
                  <td className="px-3 py-2">
                    {it.start_date} ~ {it.end_date}
                  </td>
                  <td className="px-3 py-2">{it.days}</td>
                  <td className="px-3 py-2">
                    <Link className="text-blue-700 underline" to={`/leave-requests/${it.id}`}>
                      查看
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
