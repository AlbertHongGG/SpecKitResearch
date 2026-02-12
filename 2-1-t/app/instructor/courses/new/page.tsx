'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../../src/ui/lib/apiClient';
import { Button } from '../../../../src/ui/components/Button';
import { Input } from '../../../../src/ui/components/Input';
import { Select } from '../../../../src/ui/components/Select';
import { ErrorState, LoadingState } from '../../../../src/ui/components/States';

const schema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  price: z.coerce.number().int().min(0),
  categoryId: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

type CategoriesResponse = { categories: { id: string; name: string }[] };

type CreateResp = { course: { id: string } };

export default function NewCoursePage() {
  const router = useRouter();

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoriesResponse>('/api/taxonomy/categories'),
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '', price: 0, categoryId: '' },
  });

  async function onSubmit(values: FormValues) {
    const res = await apiFetch<CreateResp>('/api/instructor/courses', {
      method: 'POST',
      body: JSON.stringify({ ...values, tagIds: [] }),
    });
    router.push(`/instructor/courses/${res.course.id}`);
  }

  if (categoriesQ.isLoading)
    return (
      <main className="mx-auto max-w-3xl p-6">
        <LoadingState />
      </main>
    );
  if (categoriesQ.isError)
    return (
      <main className="mx-auto max-w-3xl p-6">
        <ErrorState message={categoriesQ.error instanceof Error ? categoriesQ.error.message : '載入失敗'} />
      </main>
    );

  const categories = categoriesQ.data?.categories ?? [];

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-xl font-semibold">建立課程</h1>

      <form className="mt-6 space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div>
          <div className="text-sm">標題</div>
          <Input {...form.register('title')} />
          {form.formState.errors.title ? (
            <div className="mt-1 text-xs text-red-600">{form.formState.errors.title.message}</div>
          ) : null}
        </div>

        <div>
          <div className="text-sm">描述</div>
          <textarea className="mt-1 w-full rounded border border-slate-200 p-2 text-sm" rows={5} {...form.register('description')} />
          {form.formState.errors.description ? (
            <div className="mt-1 text-xs text-red-600">{form.formState.errors.description.message}</div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm">價格</div>
            <Input type="number" {...form.register('price')} />
            {form.formState.errors.price ? (
              <div className="mt-1 text-xs text-red-600">{form.formState.errors.price.message}</div>
            ) : null}
          </div>

          <div>
            <div className="text-sm">分類</div>
            <Select {...form.register('categoryId')}>
              <option value="">請選擇</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            {form.formState.errors.categoryId ? (
              <div className="mt-1 text-xs text-red-600">{form.formState.errors.categoryId.message}</div>
            ) : null}
          </div>
        </div>

        <Button type="submit">建立</Button>
      </form>
    </main>
  );
}
