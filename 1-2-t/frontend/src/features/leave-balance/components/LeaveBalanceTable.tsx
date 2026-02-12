import type { LeaveBalanceItem } from '../api/useLeaveBalance';

export function LeaveBalanceTable({ items }: { items: LeaveBalanceItem[] }) {
  return (
    <div className="overflow-hidden rounded border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-700">
          <tr>
            <th className="px-3 py-2">假別</th>
            <th className="px-3 py-2">Quota</th>
            <th className="px-3 py-2">Used</th>
            <th className="px-3 py-2">Reserved</th>
            <th className="px-3 py-2">Available</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.leave_type.id} className="border-t">
              <td className="px-3 py-2">{it.leave_type.name}</td>
              <td className="px-3 py-2">{it.quota}</td>
              <td className="px-3 py-2">{it.used}</td>
              <td className="px-3 py-2">{it.reserved}</td>
              <td className="px-3 py-2 font-medium">{it.available}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
