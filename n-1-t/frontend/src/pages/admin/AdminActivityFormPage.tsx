import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';

import { isApiError } from '../../api/http';
import { EmptyState } from '../../components/states/EmptyState';
import { ErrorState } from '../../components/states/ErrorState';
import { LoadingState } from '../../components/states/LoadingState';
import {
  useAdminActivitiesList,
  useChangeAdminActivityStatus,
  useCreateAdminActivity,
  useUpdateAdminActivity,
} from '../../hooks/admin/useAdminActivities';
import {
  adminUpsertActivitySchema,
  toAdminUpsertActivityRequest,
} from '../../schemas/activitySchemas';

function toDatetimeLocalValue(iso: string) {
  // "2026-01-01T00:00:00.000Z" -> "2026-01-01T00:00"
  return iso.slice(0, 16);
}

export function AdminActivityFormPage() {
  const navigate = useNavigate();
  const { activityId } = useParams();
  const isEdit = !!activityId;

  const listQuery = useAdminActivitiesList({ enabled: isEdit });
  const createMutation = useCreateAdminActivity();
  const updateMutation = useUpdateAdminActivity();
  const statusMutation = useChangeAdminActivityStatus();

  const existing = useMemo(() => {
    if (!isEdit) return null;
    return listQuery.data?.items.find((a) => a.id === activityId) ?? null;
  }, [activityId, isEdit, listQuery.data]);

  const form = useForm<z.input<typeof adminUpsertActivitySchema>>({
    resolver: zodResolver(adminUpsertActivitySchema),
    defaultValues: {
      title: '',
      description: '',
      location: '',
      date: '',
      deadline: '',
      capacity: 1,
    },
    mode: 'onSubmit',
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      title: existing.title,
      description: existing.description,
      location: existing.location,
      date: toDatetimeLocalValue(existing.date),
      deadline: toDatetimeLocalValue(existing.deadline),
      capacity: existing.capacity,
    });
  }, [existing, form]);

  if (isEdit && listQuery.isLoading) {
    return <LoadingState />;
  }

  if (isEdit && listQuery.isError) {
    const message = isApiError(listQuery.error) ? listQuery.error.message : 'Unknown error';
    return <ErrorState message={message} onRetry={() => listQuery.refetch()} />;
  }

  if (isEdit && !existing) {
    return <EmptyState message="找不到此活動" />;
  }

  const isBusy = createMutation.isPending || updateMutation.isPending || statusMutation.isPending;
  const error = createMutation.error ?? updateMutation.error ?? statusMutation.error;
  const errorMessage = error ? (isApiError(error) ? error.message : 'Unknown error') : null;

  const canPublish = existing?.status === 'DRAFT';
  const canClose = existing?.status === 'PUBLISHED' || existing?.status === 'FULL';
  const canArchive = existing?.status === 'DRAFT' || existing?.status === 'CLOSED';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{isEdit ? '編輯活動' : '建立活動'}</h1>
        {existing ? (
          <div className="text-sm text-slate-600">
            狀態：{existing.status}（{existing.registeredCount}/{existing.capacity}）
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link className="rounded border px-3 py-1 text-sm" to="/admin/activities">
          返回管理列表
        </Link>

        {isEdit ? (
          <>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!canPublish || isBusy}
              onClick={() =>
                statusMutation.mutate(
                  { activityId: activityId!, toStatus: 'PUBLISHED' },
                  { onSuccess: () => navigate('/admin/activities', { replace: true }) },
                )
              }
            >
              發佈
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!canClose || isBusy}
              onClick={() =>
                statusMutation.mutate(
                  { activityId: activityId!, toStatus: 'CLOSED' },
                  { onSuccess: () => navigate('/admin/activities', { replace: true }) },
                )
              }
            >
              關閉
            </button>
            <button
              type="button"
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
              disabled={!canArchive || isBusy}
              onClick={() =>
                statusMutation.mutate(
                  { activityId: activityId!, toStatus: 'ARCHIVED' },
                  { onSuccess: () => navigate('/admin/activities', { replace: true }) },
                )
              }
            >
              下架
            </button>
          </>
        ) : null}
      </div>

      {errorMessage ? <div className="text-sm text-red-700">{errorMessage}</div> : null}

      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => {
          const parsed = adminUpsertActivitySchema.parse(values);
          const body = toAdminUpsertActivityRequest(parsed);

          if (isEdit) {
            updateMutation.mutate(
              { activityId: activityId!, body },
              { onSuccess: () => navigate('/admin/activities', { replace: true }) },
            );
            return;
          }

          createMutation.mutate(body, { onSuccess: () => navigate('/admin/activities', { replace: true }) });
        })}
      >
        <div className="space-y-1">
          <label className="block text-sm" htmlFor="admin-title">
            標題
          </label>
          <input id="admin-title" className="w-full rounded border px-3 py-2" {...form.register('title')} />
          {form.formState.errors.title ? (
            <div className="text-sm text-red-700">{form.formState.errors.title.message}</div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="block text-sm" htmlFor="admin-location">
            地點
          </label>
          <input id="admin-location" className="w-full rounded border px-3 py-2" {...form.register('location')} />
          {form.formState.errors.location ? (
            <div className="text-sm text-red-700">{form.formState.errors.location.message}</div>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-sm" htmlFor="admin-date">
              活動時間
            </label>
            <input
              id="admin-date"
              type="datetime-local"
              className="w-full rounded border px-3 py-2"
              {...form.register('date')}
            />
            {form.formState.errors.date ? (
              <div className="text-sm text-red-700">{form.formState.errors.date.message}</div>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="block text-sm" htmlFor="admin-deadline">
              截止時間
            </label>
            <input
              id="admin-deadline"
              type="datetime-local"
              className="w-full rounded border px-3 py-2"
              {...form.register('deadline')}
            />
            {form.formState.errors.deadline ? (
              <div className="text-sm text-red-700">{form.formState.errors.deadline.message}</div>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm" htmlFor="admin-capacity">
            名額
          </label>
          <input
            id="admin-capacity"
            type="number"
            min={1}
            className="w-full rounded border px-3 py-2"
            {...form.register('capacity')}
          />
          {form.formState.errors.capacity ? (
            <div className="text-sm text-red-700">{form.formState.errors.capacity.message}</div>
          ) : null}
        </div>

        <div className="space-y-1">
          <label className="block text-sm" htmlFor="admin-description">
            描述
          </label>
          <textarea
            id="admin-description"
            className="h-40 w-full rounded border px-3 py-2"
            {...form.register('description')}
          />
          {form.formState.errors.description ? (
            <div className="text-sm text-red-700">{form.formState.errors.description.message}</div>
          ) : null}
        </div>

        <button
          type="submit"
          className="w-full rounded border bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={isBusy}
        >
          {isBusy ? '儲存中…' : isEdit ? '更新' : '建立'}
        </button>
      </form>
    </div>
  );
}
