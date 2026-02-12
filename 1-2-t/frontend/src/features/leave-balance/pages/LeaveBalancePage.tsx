import { useMemo, useState } from 'react';
import { useLeaveBalance } from '../api/useLeaveBalance';
import { LeaveBalanceTable } from '../components/LeaveBalanceTable';
import { getApiErrorMessage } from '../../../api/errorHandling';

function currentYear() {
  return new Date().getUTCFullYear();
}

export function LeaveBalancePage() {
  const [year, setYear] = useState<number>(currentYear());
  const q = useLeaveBalance(year);

  const items = useMemo(() => q.data ?? [], [q.data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">剩餘額度</h1>
        <p className="mt-1 text-sm text-slate-600">available = quota - used - reserved</p>
      </div>

      <div className="rounded border bg-white p-4">
        <label className="block text-sm font-medium">年度</label>
        <input
          className="mt-1 w-40 rounded border px-3 py-2"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
        />
      </div>

      {q.isLoading ? <div className="text-sm text-slate-600">載入中…</div> : null}
      {q.isError ? <div className="text-sm text-red-600">{getApiErrorMessage(q.error)}</div> : null}
      {q.isSuccess ? <LeaveBalanceTable items={items} /> : null}
    </div>
  );
}
