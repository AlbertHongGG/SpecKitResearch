'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { resolver } from '../../../lib/forms';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { applyApiErrorToForm } from '../../../services/httpErrorHandling';

const schema = z.object({
  productId: z.string().min(1, '缺少 productId'),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(1, '請輸入評價').max(500),
});

type FormValues = z.infer<typeof schema>;

export default function NewReviewPage() {
  const params = useSearchParams();
  const router = useRouter();

  const productId = params.get('productId') ?? '';

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { productId, rating: 5, comment: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(values),
      });
      router.replace('/orders');
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '送出失敗' });
    }
  });

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-semibold">新增評價</h1>

      <form className="space-y-3" onSubmit={onSubmit}>
        {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

        <input type="hidden" {...form.register('productId')} />

        <Input
          label="星等（1-5）"
          aria-label="rating"
          inputMode="numeric"
          error={form.formState.errors.rating?.message}
          {...form.register('rating')}
        />

        <Input
          label="評論（純文字）"
          aria-label="comment"
          description="最多 500 字；後端會拒絕 HTML。"
          error={form.formState.errors.comment?.message}
          {...form.register('comment')}
        />

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? '送出中…' : '送出'}
        </Button>
      </form>
    </div>
  );
}
