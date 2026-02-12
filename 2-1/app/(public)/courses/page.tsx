'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import CourseCard from '@/components/CourseCard';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { coursesClient } from '@/services/coursesClient';
import { taxonomyClient } from '@/services/taxonomyClient';

export default function CoursesPage() {
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);

  const taxonomy = useQuery({
    queryKey: queryKeys.taxonomy(),
    queryFn: async () => {
      const [categories, tags] = await Promise.all([taxonomyClient.categories(), taxonomyClient.tags()]);
      return { categories: categories.categories, tags: tags.tags };
    },
  });

  const courses = useQuery({
    queryKey: queryKeys.courses({ categoryId: categoryId ?? null, q }),
    queryFn: async () => {
      const res = await coursesClient.list({ categoryId, q });
      return res.courses;
    },
  });

  const categories = taxonomy.data?.categories;
  const selectedCategoryName = useMemo(
    () => (categories ?? []).find((c) => c.categoryId === categoryId)?.name ?? '全部分類',
    [categories, categoryId],
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">課程</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 text-sm"
          placeholder="搜尋課程…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <select
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || undefined)}
        >
          <option value="">{selectedCategoryName}</option>
          {(categories ?? []).map((c) => (
            <option key={c.categoryId} value={c.categoryId}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {courses.isLoading ? <Loading /> : null}
      {courses.isError ? <InlineError message={(courses.error as any).message ?? '載入失敗'} /> : null}

      <div className="mt-6 grid gap-4">
        {(courses.data ?? []).map((c) => (
          <CourseCard
            key={c.courseId}
            courseId={c.courseId}
            title={c.title}
            description={c.description}
            price={c.price}
            categoryName={c.category?.name}
          />
        ))}
      </div>
    </div>
  );
}
