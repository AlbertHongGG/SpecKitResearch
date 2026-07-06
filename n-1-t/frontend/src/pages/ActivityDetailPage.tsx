import { Link, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { isApiError } from '../api/http';
import { ErrorState } from '../components/states/ErrorState';
import { LoadingState } from '../components/states/LoadingState';
import { cancelRegistration, registerForActivity } from '../api/member';
import { useSession } from '../hooks/useSession';
import { usePublicActivityDetail } from '../hooks/queries/usePublicActivities';
import { useMyActivities } from '../hooks/queries/useMyActivities';

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function ActivityDetailPage() {
  const { activityId } = useParams();
  const session = useSession();
  const query = usePublicActivityDetail(activityId);
  const myActivitiesQuery = useMyActivities({ enabled: !!session.user });
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async () => {
      return registerForActivity(activityId as string, { idempotencyKey: createIdempotencyKey('register') });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activity', activityId] }),
        queryClient.invalidateQueries({ queryKey: ['public-activities'] }),
      ]);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      return cancelRegistration(activityId as string, { idempotencyKey: createIdempotencyKey('cancel') });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['my-activities'] }),
        queryClient.invalidateQueries({ queryKey: ['public-activity', activityId] }),
        queryClient.invalidateQueries({ queryKey: ['public-activities'] }),
      ]);
    },
  });

  if (!activityId) {
    return <ErrorState message="缺少 activityId" />;
  }

  if (query.isLoading) {
    return <LoadingState />;
  }

  if (query.isError) {
    const message = isApiError(query.error) ? query.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => query.refetch()} />;
  }

  if (!query.data) {
    return <ErrorState message="找不到活動" onRetry={() => query.refetch()} />;
  }

  const a = query.data;
  const isAuthed = !session.isLoading && !!session.user;
  const isRegistered =
    isAuthed && !!myActivitiesQuery.data?.items?.some((x) => x.id === activityId);
  const isBusy = registerMutation.isPending || cancelMutation.isPending;
  const actionError = registerMutation.error ?? cancelMutation.error;
  const actionErrorMessage = actionError ? (isApiError(actionError) ? actionError.message : 'Unknown error') : null;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-xl font-semibold">{a.title}</h1>
        <div className="text-sm text-slate-700">
          <div>{a.status}</div>
          <div>
            {a.registeredCount}/{a.capacity}
          </div>
        </div>
      </div>

      <div className="space-y-1 text-sm text-slate-700">
        <div>地點：{a.location}</div>
        <div>活動時間：{a.date}</div>
        <div>截止時間：{a.deadline}</div>
      </div>

      <div className="whitespace-pre-wrap rounded border bg-white p-4">{a.description}</div>

      {!session.isLoading && !session.user ? (
        <div className="rounded border bg-slate-50 p-4 text-sm">
          <div className="font-medium">登入後才能報名</div>
          <div className="mt-2">
            <Link to={`/auth?returnTo=${encodeURIComponent(`/activities/${activityId}`)}`} className="underline">
              前往登入/註冊
            </Link>
          </div>
        </div>
      ) : null}

      {isAuthed ? (
        <div className="rounded border bg-slate-50 p-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="font-medium">報名狀態：{isRegistered ? '已報名' : '尚未報名'}</div>
            <button
              type="button"
              className="rounded border bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={isBusy || myActivitiesQuery.isLoading}
              onClick={() => {
                if (isRegistered) {
                  cancelMutation.mutate();
                } else {
                  registerMutation.mutate();
                }
              }}
            >
              {myActivitiesQuery.isLoading
                ? '載入中…'
                : isBusy
                  ? '處理中…'
                  : isRegistered
                    ? '取消報名'
                    : '報名'}
            </button>
          </div>
          {actionErrorMessage ? <div className="mt-2 text-red-700">{actionErrorMessage}</div> : null}
        </div>
      ) : null}
    </div>
  );
}
