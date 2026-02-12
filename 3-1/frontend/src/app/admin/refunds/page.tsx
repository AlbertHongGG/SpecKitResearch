'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { resolver } from '../../../lib/forms';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';
import { applyApiErrorToForm } from '../../../services/httpErrorHandling';

const schema = z.object({
  refundId: z.string().min(1, '請輸入 refundId'),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function AdminRefundsPage() {
  const [notice, setNotice] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { refundId: '', reason: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setNotice(null);
    form.clearErrors();
    try {
      await apiFetch(`/api/admin/refunds/${values.refundId}/force`, {
        method: 'POST',
        body: JSON.stringify({ reason: values.reason }),
      });
      form.reset({ refundId: '', reason: '' });
      setNotice('已送出強制退款指令');
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '操作失敗' });
    }
  });

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">管理員退款</h1>
        <AdminNav />

        <form className="max-w-md space-y-3" onSubmit={onSubmit}>
          {notice ? <Alert variant="success">{notice}</Alert> : null}
          {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

          <Input
            label="Refund ID"
            aria-label="refundId"
            error={form.formState.errors.refundId?.message}
            {...form.register('refundId')}
          />

          <Input label="原因" aria-label="reason" {...form.register('reason')} />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '處理中…' : '強制退款'}
          </Button>
        </form>
      </div>
    </RoleGate>
  );
}
