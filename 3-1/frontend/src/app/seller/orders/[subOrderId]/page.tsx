'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../../services/apiClient';
import { resolver } from '../../../../lib/forms';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Alert } from '../../../../components/ui/Alert';
import { LoadingState } from '../../../../components/states/LoadingState';
import { ErrorState } from '../../../../components/states/ErrorState';
import { RoleGate } from '../../../../components/RoleGate';
import { SellerNav } from '../../../../components/SellerNav';
import { applyApiErrorToForm } from '../../../../services/httpErrorHandling';

type SubOrderItem = { id: string; productId: string; titleSnapshot: string; quantity: number; unitPriceSnapshot: number };

type SubOrder = {
  id: string;
  orderId: string;
  status: string;
  items: SubOrderItem[];
  totalAmount: number;
};

const shipSchema = z.object({
  carrier: z.string().optional(),
  trackingNo: z.string().optional(),
});

type FormValues = z.infer<typeof shipSchema>;

export default function SellerSubOrderPage() {
  const params = useParams<{ subOrderId: string }>();
  const subOrderId = params.subOrderId;

  const suborder = useQuery({
    queryKey: ['seller-suborder', subOrderId],
    queryFn: () => apiFetch<{ suborder: SubOrder }>(`/api/seller/suborders/${subOrderId}`),
  });

  const form = useForm<FormValues>({
    resolver: resolver(shipSchema),
    defaultValues: { carrier: '', trackingNo: '' },
  });

  const onShip = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch(`/api/seller/suborders/${subOrderId}/ship`, {
        method: 'POST',
        body: JSON.stringify(values),
      });
      await suborder.refetch();
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '出貨失敗' });
    }
  });

  const canShip = suborder.data?.suborder.status === 'paid';

  return (
    <RoleGate allow={['seller', 'admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">子訂單詳情</h1>
        <SellerNav />

        {suborder.isLoading ? <LoadingState /> : null}
        {suborder.isError ? (
          <ErrorState message={(suborder.error as unknown as ApiError).message} onRetry={() => suborder.refetch()} />
        ) : null}

        {suborder.data ? (
          <div className="rounded border border-neutral-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div className="font-medium">{suborder.data.suborder.id}</div>
              <div className="text-sm text-neutral-700">{suborder.data.suborder.status}</div>
            </div>

            <div className="mt-3 space-y-2 text-sm">
              {suborder.data.suborder.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between">
                  <div>{it.titleSnapshot}</div>
                  <div>
                    {it.quantity} × NT$ {Math.round(it.unitPriceSnapshot / 100)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 text-sm text-neutral-700">合計：NT$ {Math.round(suborder.data.suborder.totalAmount / 100)}</div>
          </div>
        ) : null}

        <form className="max-w-md space-y-3" onSubmit={onShip}>
          <div className="text-sm font-medium">出貨</div>

          {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

          <Input label="物流商（選填）" aria-label="carrier" {...form.register('carrier')} />

          <Input label="追蹤碼（選填）" aria-label="trackingNo" {...form.register('trackingNo')} />

          <Button type="submit" disabled={!canShip || form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '送出中…' : canShip ? '標記出貨' : '目前不可出貨'}
          </Button>

          <div className="text-xs text-neutral-600">僅 paid 狀態可出貨（paid → shipped）。</div>
        </form>
      </div>
    </RoleGate>
  );
}
