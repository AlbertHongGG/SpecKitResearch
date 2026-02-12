'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../../../../src/ui/lib/apiClient';
import { Button } from '../../../../src/ui/components/Button';
import { Input } from '../../../../src/ui/components/Input';
import { ErrorState, LoadingState } from '../../../../src/ui/components/States';
import { SubmitForReviewDialog } from '../../../../src/ui/components/instructor/SubmitForReviewDialog';

type CourseDetail = {
  id: string;
  title: string;
  description: string;
  price: number;
  coverImageUrl: string | null;
  status: string;
  rejectedReason: string | null;
  category: { id: string; name: string };
  tags: { id: string; name: string }[];
};

type CourseResp = { course: CourseDetail };

type CategoriesResponse = { categories: { id: string; name: string }[] };

type TagsResponse = { tags: { id: string; name: string }[] };

export default function InstructorCourseDetailPage() {
  const params = useParams<{ courseId: string | string[] }>();
  const courseId = Array.isArray(params.courseId) ? params.courseId[0] : params.courseId;

  const courseQ = useQuery({
    queryKey: ['instructor-course', courseId],
    queryFn: () => apiFetch<CourseResp>(`/api/instructor/courses/${courseId}`),
    enabled: Boolean(courseId),
  });

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoriesResponse>('/api/taxonomy/categories'),
  });

  const tagsQ = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiFetch<TagsResponse>('/api/taxonomy/tags'),
  });

  if (!courseId) return <main className="mx-auto max-w-5xl p-6"><ErrorState message="無效的課程 ID" /></main>;
  if (courseQ.isLoading) return <main className="mx-auto max-w-5xl p-6"><LoadingState /></main>;
  if (courseQ.isError) return <main className="mx-auto max-w-5xl p-6"><ErrorState message={courseQ.error instanceof Error ? courseQ.error.message : '載入失敗'} onRetry={() => courseQ.refetch()} /></main>;

  const c = courseQ.data!.course;

  const isSubmitted = c.status === 'submitted';

  async function save() {
    const form = document.querySelector('form') as HTMLFormElement | null;
    if (!form) return;
    const data = new FormData(form);
    const payload = {
      title: String(data.get('title') || ''),
      description: String(data.get('description') || ''),
      price: Number(data.get('price') || 0),
      categoryId: String(data.get('categoryId') || ''),
      tagIds: (data.getAll('tagIds') as string[]) ?? [],
    };
    await apiFetch(`/api/instructor/courses/${courseId}`, { method: 'PATCH', body: JSON.stringify(payload) });
    await courseQ.refetch();
  }

  async function submit() {
    await apiFetch(`/api/instructor/courses/${courseId}/submit`, { method: 'POST', body: '{}' });
    await courseQ.refetch();
  }

  async function toggleLifecycle() {
    const action = c.status === 'archived' ? 'UNARCHIVE' : 'ARCHIVE';
    await apiFetch(`/api/instructor/courses/${courseId}/lifecycle`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    await courseQ.refetch();
  }

  const categories = categoriesQ.data?.categories ?? [];
  const tags = tagsQ.data?.tags ?? [];
  const selectedTagIds = new Set(c.tags.map((t) => t.id));

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4">
        <Link href="/instructor/courses" className="text-sm underline">
          ← 回講師課程
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{c.title}</h1>
          <div className="mt-1 text-sm text-slate-600">狀態：{c.status}</div>
          {c.status === 'rejected' && c.rejectedReason ? (
            <div className="mt-1 text-sm text-red-600">駁回理由：{c.rejectedReason}</div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/instructor/courses/${courseId}/curriculum`} className="rounded border border-slate-200 px-3 py-2 text-sm">
            編輯課綱
          </Link>
          <Button type="button" variant="secondary" disabled={isSubmitted} onClick={() => void save()}>
            儲存
          </Button>
          <SubmitForReviewDialog disabled={c.status !== 'draft' && c.status !== 'rejected'} onConfirm={submit} />
          <Button
            type="button"
            variant="secondary"
            disabled={c.status !== 'published' && c.status !== 'archived'}
            onClick={() => void toggleLifecycle()}
          >
            {c.status === 'archived' ? '上架' : '下架'}
          </Button>
        </div>
      </div>

      {isSubmitted ? (
        <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          本課程目前為「送審中」。在管理員審核完成前，關鍵欄位與課綱內容將被鎖定（不可編輯）。
        </div>
      ) : null}

      <form className="mt-6 space-y-4">
        <fieldset disabled={isSubmitted} className={isSubmitted ? 'opacity-60' : ''}>
        <div>
          <div className="text-sm">標題</div>
          <Input name="title" defaultValue={c.title} />
        </div>
        <div>
          <div className="text-sm">描述</div>
          <textarea name="description" defaultValue={c.description} className="mt-1 w-full rounded border border-slate-200 p-2 text-sm" rows={5} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-sm">價格</div>
            <Input name="price" type="number" defaultValue={c.price} />
          </div>
          <div>
            <div className="text-sm">分類</div>
            <select name="categoryId" defaultValue={c.category.id} className="mt-1 w-full rounded border border-slate-200 p-2 text-sm">
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="text-sm">標籤</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {tags.map((t) => (
              <label key={t.id} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm">
                <input type="checkbox" name="tagIds" value={t.id} defaultChecked={selectedTagIds.has(t.id)} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        </fieldset>
      </form>
    </main>
  );
}
