'use client';

import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiFetch, type ApiError } from '../../../services/apiClient';
import { resolver } from '../../../lib/forms';
import { LoadingState } from '../../../components/states/LoadingState';
import { ErrorState } from '../../../components/states/ErrorState';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Alert } from '../../../components/ui/Alert';
import { RoleGate } from '../../../components/RoleGate';
import { AdminNav } from '../../../components/AdminNav';
import { applyApiErrorToForm } from '../../../services/httpErrorHandling';

type Category = { id: string; name: string; status: 'active' | 'inactive' };

const schema = z.object({ name: z.string().min(1, '請輸入分類名稱') });

type FormValues = z.infer<typeof schema>;

export default function AdminCategoriesPage() {
  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<{ items: Category[] }>('/api/admin/categories'),
  });

  const form = useForm<FormValues>({
    resolver: resolver(schema),
    defaultValues: { name: '' },
  });

  const onCreate = form.handleSubmit(async (values) => {
    form.clearErrors();
    try {
      await apiFetch('/api/admin/categories', { method: 'POST', body: JSON.stringify(values) });
      form.reset({ name: '' });
      await categories.refetch();
    } catch (e) {
      applyApiErrorToForm(form, e, { rootFallback: (e as ApiError).message ?? '建立失敗' });
    }
  });

  async function setStatus(id: string, status: 'active' | 'inactive') {
    await apiFetch(`/api/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await categories.refetch();
  }

  return (
    <RoleGate allow={['admin']}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">分類管理</h1>
        <AdminNav />

        <form className="max-w-md space-y-3" onSubmit={onCreate}>
          {form.formState.errors.root?.message ? <Alert variant="error">{form.formState.errors.root.message}</Alert> : null}

          <Input
            label="新增分類"
            aria-label="name"
            error={form.formState.errors.name?.message}
            {...form.register('name')}
          />

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? '建立中…' : '建立'}
          </Button>
        </form>

        {categories.isLoading ? <LoadingState /> : null}
        {categories.isError ? (
          <ErrorState message={(categories.error as unknown as ApiError).message} onRetry={() => categories.refetch()} />
        ) : null}

        <div className="space-y-3">
          {categories.data?.items.map((c) => (
            <div key={c.id} className="rounded border border-neutral-200 bg-white p-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-neutral-700">{c.status}</div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" onClick={() => setStatus(c.id, 'active')} disabled={c.status === 'active'}>
                  啟用
                </Button>
                <Button variant="secondary" onClick={() => setStatus(c.id, 'inactive')} disabled={c.status === 'inactive'}>
                  停用
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGate>
  );
}
