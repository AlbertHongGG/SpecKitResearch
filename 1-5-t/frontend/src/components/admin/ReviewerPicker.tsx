import { useQuery } from '@tanstack/react-query';
import type { Role, UserSummary } from '@internal/contracts';
import { adminApi } from '../../api/admin';
import { Spinner } from '../ui/Spinner';

export function ReviewerPicker(props: {
  role?: Role;
  multiple?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const { role = 'Reviewer', multiple = true, value, onChange } = props;

  const reviewersQuery = useQuery({
    queryKey: ['admin', 'users', role],
    queryFn: () => adminApi.listUsers(role),
  });

  if (reviewersQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Spinner />
        載入 reviewer…
      </div>
    );
  }

  if (reviewersQuery.error) {
    return <div className="text-sm text-rose-700">載入 reviewer 失敗</div>;
  }

  const users: UserSummary[] = reviewersQuery.data?.users ?? [];

  if (users.length === 0) {
    return <div className="text-sm text-slate-600">目前沒有可用 reviewer</div>;
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {users.map((u) => {
          const checked = value.includes(u.id);
          const inputType = multiple ? 'checkbox' : 'radio';
          const name = multiple ? `reviewer-${role}` : `reviewer-${role}-single`;
          return (
            <label key={u.id} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white p-2">
              <input
                type={inputType}
                name={name}
                checked={checked}
                onChange={(e) => {
                  if (multiple) {
                    if (e.target.checked) {
                      onChange(Array.from(new Set([...value, u.id])));
                    } else {
                      onChange(value.filter((id) => id !== u.id));
                    }
                    return;
                  }

                  if (e.target.checked) {
                    onChange([u.id]);
                  }
                }}
              />
              <span className="text-sm text-slate-900">{u.email}</span>
            </label>
          );
        })}
      </div>

      {!multiple && value.length > 0 ? (
        <button
          type="button"
          className="text-xs text-slate-600 underline"
          onClick={() => onChange([])}
        >
          清除選取
        </button>
      ) : null}
    </div>
  );
}
