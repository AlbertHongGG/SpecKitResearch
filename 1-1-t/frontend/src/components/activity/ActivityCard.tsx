import { Link } from 'react-router-dom';
import type { ActivityListItem } from '../../api/types';
import { StatusBadge } from './StatusBadge';

export function ActivityCard({ item }: { item: ActivityListItem }) {
  const a = item.activity;

  return (
    <Link
      to={`/activities/${a.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-gray-300"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold text-gray-900">{a.title}</h3>
        <div className="flex gap-2">
          <StatusBadge kind="activity" status={a.status} />
          <StatusBadge kind="registration" status={item.registrationStatus} />
        </div>
      </div>

      <p className="mt-1 line-clamp-2 text-sm text-gray-600">{a.description}</p>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>地點：{a.location}</span>
        <span>
          名額：{a.registeredCount}/{a.capacity}
        </span>
        <span>活動時間：{new Date(a.date).toLocaleString()}</span>
      </div>
    </Link>
  );
}
