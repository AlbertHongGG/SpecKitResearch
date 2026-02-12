import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAdminActivities } from '../../api/hooks/useAdminActivities';
import { ErrorState } from '../../components/feedback/ErrorState';
import { Loading } from '../../components/feedback/Loading';
import {
  adminActivitySchema,
  type AdminActivityFormValues,
} from '../../lib/zodSchemas';

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoFromLocalInput(localValue: string): string {
  return new Date(localValue).toISOString();
}

function FieldError(props: { message?: string }) {
  if (!props.message) return null;
  return <div className="mt-1 text-xs text-red-700">{props.message}</div>;
}

export function AdminActivityEditorPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const isNew = !id;

  const { list, create, update } = useAdminActivities();
  const existing = id ? list.data?.items.find((a) => a.id === id) : undefined;

  const form = useForm<AdminActivityFormValues>({
    resolver: zodResolver(adminActivitySchema),
    defaultValues: {
      title: '',
      description: '',
      date: '',
      deadline: '',
      location: '',
      capacity: 10,
    },
  });

  useEffect(() => {
    if (!existing) return;
    form.reset({
      title: existing.title,
      description: existing.description,
      date: toLocalInputValue(existing.date),
      deadline: toLocalInputValue(existing.deadline),
      location: existing.location,
      capacity: existing.capacity,
    });
  }, [existing, form]);

  const busy = create.isPending || update.isPending;

  if (!isNew && list.isLoading) return <Loading label="載入活動中…" />;
  if (!isNew && list.isError) return <ErrorState error={list.error} title="載入失敗" />;
  if (!isNew && !existing) {
    return <ErrorState title="找不到活動" message="活動不存在或已被刪除。" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            後台：{isNew ? '建立活動' : '編輯活動'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">草稿可先建立，之後再發布。</p>
        </div>
        <Link className="text-sm text-indigo-600 underline" to="/admin">
          回到列表
        </Link>
      </div>

      <form
        className="mt-4 space-y-4"
        onSubmit={form.handleSubmit(async (values) => {
          const payload = {
            title: values.title,
            description: values.description,
            date: toIsoFromLocalInput(values.date),
            deadline: toIsoFromLocalInput(values.deadline),
            location: values.location,
            capacity: values.capacity,
          };

          if (isNew) {
            const created = await create.mutateAsync(payload);
            nav(`/admin/activities/${created.id}`);
          } else {
            await update.mutateAsync({ id: existing!.id, patch: payload });
          }
        })}
      >
        <div>
          <label className="block text-sm font-medium text-gray-800">標題</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register('title')}
            disabled={busy}
          />
          <FieldError message={form.formState.errors.title?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">描述</label>
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            rows={4}
            {...form.register('description')}
            disabled={busy}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-800">活動時間</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              {...form.register('date')}
              disabled={busy}
            />
            <FieldError message={form.formState.errors.date?.message} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-800">報名截止</label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              {...form.register('deadline')}
              disabled={busy}
            />
            <FieldError message={form.formState.errors.deadline?.message} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">地點</label>
          <input
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register('location')}
            disabled={busy}
          />
          <FieldError message={form.formState.errors.location?.message} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-800">名額</label>
          <input
            type="number"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            {...form.register('capacity', { valueAsNumber: true })}
            disabled={busy}
            min={1}
          />
          <FieldError message={form.formState.errors.capacity?.message} />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isNew ? '建立草稿' : '儲存變更'}
          </button>

          {!isNew ? (
            <Link
              to="/admin"
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
            >
              回列表
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
