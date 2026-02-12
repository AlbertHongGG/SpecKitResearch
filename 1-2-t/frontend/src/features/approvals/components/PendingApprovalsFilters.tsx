import type { LeaveType } from '../../leave-requests/api/useLeaveTypes';

export interface PendingApprovalsFilterValues {
  employeeName: string;
  leaveTypeId: string;
  start: string;
  end: string;
}

export function PendingApprovalsFilters({
  leaveTypes,
  value,
  onChange,
}: {
  leaveTypes: LeaveType[];
  value: PendingApprovalsFilterValues;
  onChange: (next: PendingApprovalsFilterValues) => void;
}) {
  return (
    <div className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-4">
      <div>
        <label className="block text-sm font-medium">員工</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          value={value.employeeName}
          onChange={(e) => onChange({ ...value, employeeName: e.target.value })}
          placeholder="姓名關鍵字"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">假別</label>
        <select
          className="mt-1 w-full rounded border px-3 py-2"
          value={value.leaveTypeId}
          onChange={(e) => onChange({ ...value, leaveTypeId: e.target.value })}
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
          value={value.start}
          onChange={(e) => onChange({ ...value, start: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium">結束日（≤）</label>
        <input
          className="mt-1 w-full rounded border px-3 py-2"
          type="date"
          value={value.end}
          onChange={(e) => onChange({ ...value, end: e.target.value })}
        />
      </div>
    </div>
  );
}
