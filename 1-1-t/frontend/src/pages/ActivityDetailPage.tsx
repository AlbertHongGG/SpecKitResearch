import { useNavigate, useParams } from 'react-router-dom';
import { useActivityDetail } from '../api/hooks/useActivityDetail';
import { useRegistrationMutations } from '../api/hooks/useRegistrationMutations';
import { ErrorState } from '../components/feedback/ErrorState';
import { Loading } from '../components/feedback/Loading';
import { StatusBadge } from '../components/activity/StatusBadge';

export function ActivityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();

  const q = useActivityDetail(id);
  const { register, cancel } = useRegistrationMutations();

  if (q.isLoading) return <Loading label="載入活動詳情中…" />;
  if (q.isError)
    return <ErrorState error={q.error} title="載入失敗" message={(q.error as any)?.message} />;
  if (!q.data) return <ErrorState title="找不到活動" message="活動不存在或已下架" />;

  const a = q.data;
  const isBusy = register.isPending || cancel.isPending;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold text-gray-900">{a.title}</h1>
        <div className="flex gap-2">
          <StatusBadge kind="activity" status={a.status} />
          <StatusBadge kind="registration" status={a.registrationStatus} />
        </div>
      </div>

      <p className="mt-2 text-sm text-gray-700">{a.description}</p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-700">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>地點：{a.location}</div>
          <div>
            名額：{a.registeredCount}/{a.capacity}
          </div>
          <div>活動時間：{new Date(a.date).toLocaleString()}</div>
          <div>報名截止：{new Date(a.deadline).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {a.registrationStatus === 'auth_required' && (
          <button
            type="button"
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            onClick={() => nav('/login', { replace: false })}
          >
            登入後報名
          </button>
        )}

        {a.registrationStatus === 'can_register' && (
          <button
            type="button"
            disabled={isBusy}
            className="rounded bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => register.mutate(a.id)}
          >
            {register.isPending ? '報名中…' : '報名'}
          </button>
        )}

        {a.registrationStatus === 'registered' && (
          <button
            type="button"
            disabled={isBusy}
            className="rounded bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => cancel.mutate(a.id)}
          >
            {cancel.isPending ? '取消中…' : '取消報名'}
          </button>
        )}

        {(a.registrationStatus === 'full' ||
          a.registrationStatus === 'closed' ||
          a.registrationStatus === 'ended') && (
          <button
            type="button"
            disabled
            className="rounded bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700"
          >
            無法報名（{a.registrationStatus}）
          </button>
        )}
      </div>
    </div>
  );
}
