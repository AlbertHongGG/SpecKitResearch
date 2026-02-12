import type { AdminRegistrationItem } from '../../api/types';

export function RegistrationsTable(props: { items: AdminRegistrationItem[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold text-gray-700">
          <tr>
            <th className="px-3 py-2">姓名</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">報名時間</th>
            <th className="px-3 py-2">取消時間</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {props.items.map((r) => (
            <tr key={r.userId} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900">{r.name}</td>
              <td className="px-3 py-2 text-gray-800">{r.email}</td>
              <td className="px-3 py-2 text-xs text-gray-700">
                {new Date(r.registeredAt).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">
                {r.canceledAt ? new Date(r.canceledAt).toLocaleString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
