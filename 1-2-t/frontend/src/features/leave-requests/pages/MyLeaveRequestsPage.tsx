import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLeaveTypes } from '../api/useLeaveTypes';
import { useMyLeaveRequests } from '../api/useMyLeaveRequests';
import type { LeaveRequestStatus } from '../api/leaveRequestsApi';
import { getApiErrorMessage } from '../../../api/errorHandling';
import { MyLeaveRequestsFilters } from '../components/MyLeaveRequestsFilters';
import { MyLeaveRequestsSort } from '../components/MyLeaveRequestsSort';
import { LeaveRequestListItem } from '../components/LeaveRequestListItem';

export function MyLeaveRequestsPage() {
  const leaveTypes = useLeaveTypes();
  const [status, setStatus] = useState<LeaveRequestStatus | ''>('');
  const [leaveTypeId, setLeaveTypeId] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [sort, setSort] = useState<'start_date_desc' | 'start_date_asc'>('start_date_desc');

  const filters = useMemo(
    () => ({
      status: status || undefined,
      leaveTypeId: leaveTypeId || undefined,
      start: start || undefined,
      end: end || undefined,
      sort,
    }),
    [status, leaveTypeId, start, end, sort],
  );

  const q = useMyLeaveRequests(filters);

  if (leaveTypes.isLoading || q.isLoading) return <div className="p-6 text-sm text-slate-600">載入中…</div>;
  if (leaveTypes.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(leaveTypes.error)}</div>;
  if (q.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(q.error)}</div>;

  const items = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">我的請假</h1>
          <p className="mt-1 text-sm text-slate-600">查看你的草稿/送出/核准/駁回/撤回記錄。</p>
        </div>
        <Link className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white" to="/leave-requests/new">
          新增請假
        </Link>
      </div>

      <MyLeaveRequestsFilters
        leaveTypes={leaveTypes.data ?? []}
        status={status}
        leaveTypeId={leaveTypeId}
        start={start}
        end={end}
        onChange={(next) => {
          setStatus(next.status);
          setLeaveTypeId(next.leaveTypeId);
          setStart(next.start);
          setEnd(next.end);
        }}
      />

      <MyLeaveRequestsSort value={sort} onChange={setSort} />

      {items.length === 0 ? (
        <div className="rounded border bg-white p-6 text-sm text-slate-600">沒有資料。</div>
      ) : (
        <div className="overflow-hidden rounded border bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-700">
              <tr>
                <th className="px-3 py-2">假別</th>
                <th className="px-3 py-2">日期</th>
                <th className="px-3 py-2">天數</th>
                <th className="px-3 py-2">狀態</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <LeaveRequestListItem key={it.id} item={it} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
