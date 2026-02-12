import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rejectFormSchema, type RejectFormValues } from '../../approvals/forms/rejectFormSchema';
import { useApproveLeaveRequest } from '../../approvals/api/useApproveLeaveRequest';
import { useRejectLeaveRequest } from '../../approvals/api/useRejectLeaveRequest';
import { getApiErrorMessage } from '../../../api/errorHandling';

export function ApproverDecisionPanel({ leaveRequestId }: { leaveRequestId: string }) {
  const approve = useApproveLeaveRequest();
  const reject = useRejectLeaveRequest();

  const [note, setNote] = useState('');

  const form = useForm<RejectFormValues>({
    resolver: zodResolver(rejectFormSchema),
    defaultValues: { reason: '' },
  });

  return (
    <div className="rounded border bg-white p-4">
      <div className="text-sm font-medium text-slate-900">主管審核</div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">核准備註（選填）</label>
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            className="mt-2 rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            type="button"
            disabled={approve.isPending || reject.isPending}
            onClick={() => approve.mutate({ id: leaveRequestId, note: note || undefined })}
          >
            {approve.isPending ? '核准中…' : '核准'}
          </button>
        </div>

        <form
          onSubmit={form.handleSubmit((values) => reject.mutate({ id: leaveRequestId, reason: values.reason }))}
        >
          <label className="block text-sm font-medium">駁回原因（必填）</label>
          <input className="mt-1 w-full rounded border px-3 py-2" {...form.register('reason')} />
          {form.formState.errors.reason?.message ? (
            <p className="mt-1 text-sm text-red-600">{form.formState.errors.reason.message}</p>
          ) : null}
          <button
            className="mt-2 rounded bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            type="submit"
            disabled={approve.isPending || reject.isPending}
          >
            {reject.isPending ? '駁回中…' : '駁回'}
          </button>
        </form>
      </div>

      {approve.isError ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {getApiErrorMessage(approve.error)}
        </div>
      ) : null}
      {reject.isError ? (
        <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {getApiErrorMessage(reject.error)}
        </div>
      ) : null}
    </div>
  );
}
