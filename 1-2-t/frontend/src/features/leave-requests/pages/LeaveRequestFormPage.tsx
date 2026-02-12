import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leaveRequestFormSchema, type LeaveRequestFormValues } from '../forms/leaveRequestFormSchema';
import { useLeaveTypes } from '../api/useLeaveTypes';
import { useSaveDraft } from '../api/useSaveDraft';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../api/http';
import type { LeaveRequestDetail } from '../api/leaveRequestsApi';
import { getApiErrorMessage } from '../../../api/errorHandling';
import { AttachmentUploader } from '../../attachments/components/AttachmentUploader';

export function LeaveRequestFormPage() {
  const nav = useNavigate();
  const params = useParams();
  const editingId = params.id;

  const leaveTypes = useLeaveTypes();

  const detail = useQuery({
    queryKey: ['leave-request', editingId],
    queryFn: async () => apiRequest<LeaveRequestDetail>(`/leave-requests/${editingId}`),
    enabled: !!editingId,
  });

  const save = useSaveDraft();

  const form = useForm<LeaveRequestFormValues>({
    resolver: zodResolver(leaveRequestFormSchema),
    defaultValues: {
      leave_type_id: '',
      start_date: '',
      end_date: '',
      reason: '',
      attachment_id: null,
    },
  });

  const [attachmentLabel, setAttachmentLabel] = useState<string | null>(null);

  const selectedLeaveTypeId = useWatch({ control: form.control, name: 'leave_type_id' });

  useEffect(() => {
    if (!detail.data) return;
    const lr = detail.data;
    form.reset({
      leave_type_id: lr.leave_type.id,
      start_date: lr.start_date,
      end_date: lr.end_date,
      reason: lr.reason,
      attachment_id: lr.attachment_url ? lr.attachment_url.split('/').pop() ?? null : null,
    });
  }, [detail.data, form]);

  const selectedLeaveType = useMemo(() => {
    return leaveTypes.data?.find((x) => x.id === selectedLeaveTypeId) ?? null;
  }, [leaveTypes.data, selectedLeaveTypeId]);

  const requiresAttachment = !!selectedLeaveType?.require_attachment;

  const canSave = !save.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    if (requiresAttachment && !values.attachment_id) {
      form.setError('attachment_id', { message: '此假別需要附件' });
      return;
    }

    const res = await save.mutateAsync({
      id: editingId,
      payload: {
        leave_type_id: values.leave_type_id,
        start_date: values.start_date,
        end_date: values.end_date,
        reason: values.reason,
        attachment_id: values.attachment_id ?? null,
      },
    });

    nav(`/leave-requests/${res.id}`, { replace: true });
  });

  if (leaveTypes.isLoading) return <div className="p-6 text-sm text-slate-600">載入假別中…</div>;
  if (leaveTypes.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(leaveTypes.error)}</div>;

  if (detail.isLoading) return <div className="p-6 text-sm text-slate-600">載入草稿中…</div>;
  if (detail.isError) return <div className="p-6 text-sm text-red-600">{getApiErrorMessage(detail.error)}</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{editingId ? '編輯請假草稿' : '新增請假'}</h1>
        <p className="mt-1 text-sm text-slate-600">送出前可先儲存草稿。</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded border bg-white p-4">
        <div>
          <label className="block text-sm font-medium">假別</label>
          <select className="mt-1 w-full rounded border px-3 py-2" {...form.register('leave_type_id')}>
            <option value="">請選擇…</option>
            {leaveTypes.data?.map((lt) => (
              <option value={lt.id} key={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>
          {requiresAttachment ? (
            <p className="mt-1 text-xs text-slate-500">此假別需要附件（送出時必填）</p>
          ) : null}
          {form.formState.errors.leave_type_id?.message ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.leave_type_id.message}</p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">開始日期</label>
            <input className="mt-1 w-full rounded border px-3 py-2" type="date" {...form.register('start_date')} />
            {form.formState.errors.start_date?.message ? (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.start_date.message}</p>
            ) : null}
          </div>
          <div>
            <label className="block text-sm font-medium">結束日期</label>
            <input className="mt-1 w-full rounded border px-3 py-2" type="date" {...form.register('end_date')} />
            {form.formState.errors.end_date?.message ? (
              <p className="mt-1 text-sm text-red-600">{form.formState.errors.end_date.message}</p>
            ) : null}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">原因</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2" rows={4} {...form.register('reason')} />
          {form.formState.errors.reason?.message ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.reason.message}</p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium">附件</label>
          <AttachmentUploader
            value={
              form.getValues('attachment_id')
                ? { attachmentId: form.getValues('attachment_id') as string, label: attachmentLabel ?? '已上傳' }
                : null
            }
            onChange={(next) => {
              form.setValue('attachment_id', next?.attachmentId ?? null);
              setAttachmentLabel(next?.label ?? null);
            }}
          />
          {form.formState.errors.attachment_id?.message ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.attachment_id.message}</p>
          ) : null}
        </div>

        {save.isError ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {getApiErrorMessage(save.error)}
          </div>
        ) : null}

        <div className="flex items-center gap-2">
          <button
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            type="submit"
            disabled={!canSave}
          >
            {save.isPending ? '儲存中…' : '儲存草稿'}
          </button>

          <button
            className="rounded border px-4 py-2 text-sm"
            type="button"
            onClick={() => nav('/')}
          >
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
