import type { LeaveType } from '../api/useLeaveTypes';
import type { LeaveRequestStatus } from '../api/leaveRequestsApi';

export function MyLeaveRequestsFilters({
  leaveTypes,
  status,
  leaveTypeId,
  start,
  end,
  onChange,
}: {
  leaveTypes: LeaveType[];
  status: LeaveRequestStatus | '';
  leaveTypeId: string;
  start: string;
  end: string;
  onChange: (next: { status: LeaveRequestStatus | ''; leaveTypeId: string; start: string; end: string }) => void;
}) {
  return (
    <div className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-4">
      <div>
        <label className="block text-sm font-medium">狀態</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={status}
          onChange={(e) => onChange({ status: e.target.value as LeaveRequestStatus | '', leaveTypeId, start, end })}
        >
          <option value="">全部</option>
          <option value="draft">draft</option>
          <option value="submitted">submitted</option>
          <option value="approved">approved</option>
          <option value="rejected">rejected</option>
          <option value="cancelled">cancelled</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">假別</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={leaveTypeId}
          onChange={(e) => onChange({ status, leaveTypeId: e.target.value, start, end })}
        >
          <option value="">全部</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>
              {lt.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium">開始日（≥）</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          type="date"
          value={start}
          onChange={(e) => onChange({ status, leaveTypeId, start: e.target.value, end })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">結束日（≤）</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          type="date"
          value={end}
          onChange={(e) => onChange({ status, leaveTypeId, start, end: e.target.value })}
        />
      </div>
    </div>
  );
}
