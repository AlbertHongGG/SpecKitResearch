import { Link } from 'react-router-dom';
import type { LeaveRequestListItem as Item } from '../api/leaveRequestsApi';

function statusBadge(status: Item['status']) {
  const base = 'inline-flex items-center rounded px-2 py-1 text-xs font-medium';
  switch (status) {
    case 'draft':
      return <span className={`${base} bg-slate-100 text-slate-800`}>draft</span>;
    case 'submitted':
      return <span className={`${base} bg-amber-100 text-amber-800`}>submitted</span>;
    case 'approved':
      return <span className={`${base} bg-emerald-100 text-emerald-800`}>approved</span>;
    case 'rejected':
      return <span className={`${base} bg-rose-100 text-rose-800`}>rejected</span>;
    case 'cancelled':
      return <span className={`${base} bg-slate-100 text-slate-700`}>cancelled</span>;
  }
}

export function LeaveRequestListItem({ item }: { item: Item }) {
  return (
    <tr className="border-t">
      <td className="px-3 py-2">{item.leave_type.name}</td>
      <td className="px-3 py-2">
        {item.start_date} ~ {item.end_date}
      </td>
      <td className="px-3 py-2">{item.days}</td>
      <td className="px-3 py-2">{statusBadge(item.status)}</td>
      <td className="px-3 py-2">
        <Link className="text-blue-700 underline" to={`/leave-requests/${item.id}`}>
          查看
        </Link>
      </td>
    </tr>
  );
}
