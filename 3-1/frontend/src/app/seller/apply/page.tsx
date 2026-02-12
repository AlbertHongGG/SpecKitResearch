'use client';

import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { resolver } from '../../../lib/forms';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { applyApiErrorToForm } from '../../../services/httpErrorHandling';

const schema = z.object({
  shopName: z.string().min(1, '請輸入店鋪名稱'),
});

type FormValues = z.infer<typeof schema>;

type Application = {
  id: string;
  shopName: string;
  status: 'submitted' | 'approved' | 'rejected';
  createdAt: string;
} | null;

export default function SellerApplyPage() {
  const application = useQuery({
    queryKey: ['seller-application'],
    queryFn: () => apiFetch<{ application: Application }>('/api/seller/application'),
  });

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { shopName: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch('/api/seller/apply', { method: 'POST', body: JSON.stringify(values) });
      await application.refetch();
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '送出申請失敗' });
    }
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">申請成為賣家</h1>

      {application.isLoading ? <LoadingState /> : null}
      {application.isError ? (
        <ErrorState message={(application.error as unknown as ApiError).message} onRetry={() => application.refetch()} />
      ) : null}

      {application.data ? (
        <div className="rounded border border-neutral-200 bg-white p-4 text-sm">
          <div className="font-medium">目前狀態</div>
          <div className="mt-1">{application.data.application ? application.data.application.status : '尚未申請'}</div>
        </div>
      ) : null}

      <form className="max-w-md space-y-3" onSubmit={onSubmit}>
        {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

        <Input
          label="店鋪名稱"
          aria-label="shopName"
          error={form.formState.errors.shopName?.message}
          {...form.register('shopName')}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '送出中…' : '送出申請'}
        </Button>
      </form>

      <div className="text-sm text-neutral-700">
        申請送出後，請等待管理員審核。核准後將可使用賣家功能。
      </div>
    </div>
  );
}
