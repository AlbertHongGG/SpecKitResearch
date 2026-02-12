'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../src/ui/lib/apiClient';
import { ErrorState, LoadingState, EmptyState } from '../../../src/ui/components/States';

type InstructorCourse = {
  id: string;
  title: string;
  price: number;
  status: string;
  updatedAt: string;
  category: { id: string; name: string };
};

type CoursesResponse = { courses: InstructorCourse[] };

const STATUS_TABS = ['all', 'draft', 'submitted', 'published', 'rejected', 'archived'] as const;

export default function InstructorCoursesPage() {
  const [tab, setTab] = useState<(typeof STATUS_TABS)[number]>('all');

  const q = useQuery({
    queryKey: ['instructor-courses'],
    queryFn: () => apiFetch<CoursesResponse>('/api/instructor/courses'),
  });

  const filtered = useMemo(() => {
    const courses = q.data?.courses ?? [];
    if (tab === 'all') return courses;
    return courses.filter((c) => c.status === tab);
  }, [q.data, tab]);

  if (q.isLoading)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <LoadingState />
      </main>
    );
  if (q.isError)
    return (
      <main className="mx-auto max-w-5xl p-6">
        <ErrorState message={q.error instanceof Error ? q.error.message : '載入失敗'} onRetry={() => q.refetch()} />
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">講師課程</h1>
          <div className="mt-1 text-sm text-slate-600">管理你的課程、課綱、狀態</div>
        </div>
        <Link href="/instructor/courses/new" className="rounded bg-slate-900 px-3 py-2 text-sm text-white">
          + 建立課程
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            type="button"
            className={
              'rounded border px-3 py-1 text-sm ' +
              (tab === s ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200')
            }
            onClick={() => setTab(s)}
          >
            {s}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="沒有課程" description="建立一門新課程開始" />
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/instructor/courses/${c.id}`} className="block rounded border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold">{c.title}</div>
                  <div className="mt-1 text-xs text-slate-600">
                    {c.category.name} · {c.status} · NT$ {c.price}
                  </div>
                </div>
                <div className="text-xs text-slate-500">{new Date(c.updatedAt).toLocaleString()}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
