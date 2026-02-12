'use client';

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { zodResolver } from '@/lib/forms/zodResolver';
import type { CategoryItem, TagItem } from '@/services/taxonomyClient';

const schema = z.object({
  categoryId: z.string().min(1, '請選擇分類'),
  title: z.string().min(1, '標題必填').max(200),
  description: z.string().min(1, '描述必填').max(5000),
  price: z.coerce.number().int().min(0, '價格需 >= 0'),
});

type FormValues = z.infer<typeof schema>;

export function CourseForm({
  categories,
  tags,
  initial,
  onSubmit,
  submitLabel,
  cover,
  onCoverFileIdChange,
}: {
  categories: CategoryItem[];
  tags: TagItem[];
  initial?: Partial<FormValues>;
  onSubmit: (values: FormValues & { tagIds: string[] }) => Promise<void>;
  submitLabel: string;
  cover?: { fileId: string; url: string } | null;
  onCoverFileIdChange?: (fileId: string) => void;
}) {
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const defaultValues = useMemo(
    () => ({
      categoryId: initial?.categoryId ?? (categories[0]?.categoryId ?? ''),
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      price: initial?.price ?? 0,
    }),
    [initial, categories],
  );

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  return (
    <form
      className="space-y-4"
      onSubmit={handleSubmit(async (values) => {
        setError(null);
        try {
          await onSubmit({ ...values, tagIds });
        } catch (e) {
          setError(e instanceof Error ? e.message : '送出失敗');
        }
      })}
    >
      <div>
        <label className="text-sm font-medium text-slate-900" htmlFor="course-category">分類</label>
        <Select id="course-category" aria-invalid={!!errors.categoryId} {...register('categoryId')}>
          {categories.map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </Select>
        {errors.categoryId ? <InlineError message={errors.categoryId.message ?? '錯誤'} /> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-900" htmlFor="course-title">標題</label>
        <Input id="course-title" aria-invalid={!!errors.title} {...register('title')} />
        {errors.title ? <InlineError message={errors.title.message ?? '錯誤'} /> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-900" htmlFor="course-description">描述</label>
        <Textarea id="course-description" aria-invalid={!!errors.description} rows={6} {...register('description')} />
        {errors.description ? <InlineError message={errors.description.message ?? '錯誤'} /> : null}
      </div>

      <div>
        <label className="text-sm font-medium text-slate-900" htmlFor="course-price">價格（TWD）</label>
        <Input id="course-price" aria-invalid={!!errors.price} type="number" min={0} step={1} {...register('price')} />
        {errors.price ? <InlineError message={errors.price.message ?? '錯誤'} /> : null}
      </div>

      <div>
        <div className="text-sm font-medium text-slate-900">標籤</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((t) => {
            const checked = tagIds.includes(t.tagId);
            return (
              <label key={t.tagId} className="flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setTagIds((prev) =>
                      prev.includes(t.tagId) ? prev.filter((x) => x !== t.tagId) : [...prev, t.tagId],
                    );
                  }}
                />
                {t.name}
              </label>
            );
          })}
        </div>
      </div>

      {cover ? (
        <div>
          <div className="text-sm font-medium text-slate-900">封面</div>
          <div className="mt-2 text-sm">
            <a className="text-slate-700 underline" href={cover.url} target="_blank" rel="noreferrer">
              {cover.fileId}
            </a>
            {onCoverFileIdChange ? (
              <Button
                type="button"
                className="ml-3 bg-slate-700 hover:bg-slate-600"
                onClick={() => onCoverFileIdChange(cover.fileId)}
              >
                設為封面
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? <InlineError message={error} /> : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? '送出中…' : submitLabel}
      </Button>
    </form>
  );
}
