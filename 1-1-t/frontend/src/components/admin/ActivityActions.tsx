import { Link } from 'react-router-dom';
import type { Activity, ActivityTransitionAction } from '../../api/types';

function allowedActions(status: Activity['status']): ActivityTransitionAction[] {
  switch (status) {
    case 'draft':
      return ['publish'];
    case 'published':
      return ['unpublish', 'close'];
    case 'full':
      return ['close'];
    case 'closed':
      return ['archive'];
    case 'archived':
    default:
      return [];
  }
}

function labelFor(action: ActivityTransitionAction): string {
  switch (action) {
    case 'publish':
      return '發布';
    case 'unpublish':
      return '取消發布';
    case 'close':
      return '關閉報名';
    case 'archive':
      return '下架';
  }
}

export function ActivityActions(props: {
  activity: Activity;
  busy?: boolean;
  onTransition: (action: ActivityTransitionAction) => void;
}) {
  const actions = allowedActions(props.activity.status);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        to={`/admin/activities/${props.activity.id}`}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
      >
        編輯
      </Link>

      <Link
        to={`/admin/activities/${props.activity.id}/registrations`}
        className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-800 hover:bg-gray-50"
      >
        名單
      </Link>

      {actions.map((a) => (
        <button
          key={a}
          type="button"
          disabled={props.busy}
          onClick={() => props.onTransition(a)}
          className="rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs text-indigo-800 hover:bg-indigo-100 disabled:opacity-50"
        >
          {labelFor(a)}
        </button>
      ))}
    </div>
  );
}
