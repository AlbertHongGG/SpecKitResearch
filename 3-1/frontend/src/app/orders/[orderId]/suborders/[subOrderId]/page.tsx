'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../../../services/apiClient';
import { LoadingState } from '../../../../../components/states/LoadingState';
import { ErrorState } from '../../../../../components/states/ErrorState';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import { Alert } from '../../../../../components/ui/Alert';
import { resolver } from '../../../../../lib/forms';
import { applyApiErrorToForm } from '../../../../../services/httpErrorHandling';

type SubOrderItem = {
  id: string;
  productId: string;
  unitPriceSnapshot: number;
  quantity: number;
};

type OrderDetail = {
  id: string;
  subOrders: Array<{ id: string; status: string; subtotal: number; items: SubOrderItem[] }>;
};

const refundSchema = z.object({
  reason: z.string().min(1, '請輸入原因'),
  requestedAmount: z.coerce.number().int().min(0, '金額需為整數'),
});

type RefundForm = z.infer<typeof refundSchema>;

export default function SubOrderDetailPage() {
  const params = useParams<{ orderId: string; subOrderId: string }>();
  const orderId = params.orderId;
  const subOrderId = params.subOrderId;

  const order = useQuery({
    queryKey: ['orders', orderId],
    queryFn: () => apiFetch<{ order: OrderDetail }>(`/api/orders/${orderId}`),
  });

  const detail = order.data?.order;
  const sub = detail?.subOrders.find((s) => s.id === subOrderId);

  const form = useForm<RefundForm>({
    resolver: resolver(refundSchema),
    defaultValues: { reason: '', requestedAmount: 0 },
  });

  async function requestRefund(values: RefundForm) {
    await apiFetch('/api/refunds', {
      method: 'POST',
      body: JSON.stringify({
        suborderId: subOrderId,
        reason: values.reason,
        requestedAmount: values.requestedAmount,
      }),
    });
    await order.refetch();
  }

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await requestRefund(values);
      form.reset({ reason: '', requestedAmount: 0 });
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '申請退款失敗' });
    }
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">子訂單詳情</h1>
        <Link className="text-sm underline" href={`/orders/${orderId}`}>
          回訂單
        </Link>
      </div>

      {order.isLoading ? <LoadingState /> : null}
      {order.isError ? (
        <ErrorState message={(order.error as unknown as ApiError).message} onRetry={() => order.refetch()} />
      ) : null}

      {sub ? (
        <div className="mt-4 rounded border border-neutral-200 bg-white p-4">
          <div className="text-sm">子訂單：{sub.id}</div>
          <div className="mt-1 text-sm">狀態：{sub.status}</div>
          <div className="mt-1 text-sm">小計：NT$ {Math.round(sub.subtotal / 100)}</div>

          <div className="mt-4">
            <div className="font-semibold">品項</div>
            <div className="mt-2 space-y-1 text-sm">
              {sub.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.productId}</span>
                  <span>
                    {it.quantity} × NT$ {Math.round(it.unitPriceSnapshot / 100)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 border-t border-neutral-200 pt-4">
            <div className="text-sm font-semibold">申請退款</div>

            <form className="mt-3 max-w-md space-y-3" onSubmit={onSubmit}>
              {form.formState.errors.root?.message ? (
                <Alert variant="error">{form.formState.errors.root.message}</Alert>
              ) : null}

              <Input
                label="原因"
                aria-label="reason"
                error={form.formState.errors.reason?.message}
                {...form.register('reason')}
              />

              <Input
                label="金額（分）"
                aria-label="requestedAmount"
                inputMode="numeric"
                placeholder={String(sub.subtotal)}
                description="可用子訂單小計為上限（依後端規則檢查）。"
                error={form.formState.errors.requestedAmount?.message}
                {...form.register('requestedAmount')}
              />

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? '送出中…' : '送出退款申請'}
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
