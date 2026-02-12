import type { Activity, ActivityTransitionAction } from '../../api/types';
import { StatusBadge } from '../activity/StatusBadge';
import { ActivityActions } from './ActivityActions';

export function ActivityTable(props: {
  items: Activity[];
  busy?: boolean;
  onTransition: (activityId: string, action: ActivityTransitionAction) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-gray-50 text-xs font-semibold text-gray-700">
          <tr>
            <th className="px-3 py-2">標題</th>
            <th className="px-3 py-2">狀態</th>
            <th className="px-3 py-2">日期</th>
            <th className="px-3 py-2">截止</th>
            <th className="px-3 py-2">名額</th>
            <th className="px-3 py-2">已報名</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {props.items.map((a) => (
            <tr key={a.id} className="hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="font-medium text-gray-900">{a.title}</div>
                <div className="mt-1 line-clamp-1 text-xs text-gray-500">{a.location}</div>
              </td>
              <td className="px-3 py-2">
                <StatusBadge kind="activity" status={a.status} />
              </td>
              <td className="px-3 py-2 text-xs text-gray-700">{new Date(a.date).toLocaleString()}</td>
              <td className="px-3 py-2 text-xs text-gray-700">
                {new Date(a.deadline).toLocaleString()}
              </td>
              <td className="px-3 py-2 tabular-nums text-gray-800">{a.capacity}</td>
              <td className="px-3 py-2 tabular-nums text-gray-800">{a.registeredCount}</td>
              <td className="px-3 py-2">
                <ActivityActions
                  activity={a}
                  busy={props.busy}
                  onTransition={(action) => props.onTransition(a.id, action)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
