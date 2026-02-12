'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ReviewDecisionForm } from '@/components/admin/ReviewDecisionForm';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { adminClient } from '@/services/adminClient';

export default function AdminReviewDetailPage() {
  const { courseId } = useParams() as { courseId: string };

  const courseQ = useQuery({ queryKey: queryKeys.adminCourse(courseId), queryFn: () => adminClient.getCourse(courseId) });
  const reviewsQ = useQuery({ queryKey: ['admin', 'reviews', courseId], queryFn: () => adminClient.listReviews(courseId) });

  if (courseQ.isLoading || reviewsQ.isLoading) return <Loading />;
  if (courseQ.isError) return <InlineError message={(courseQ.error as any)?.message ?? '載入失敗'} />;
  if (reviewsQ.isError) return <InlineError message={(reviewsQ.error as any)?.message ?? '載入失敗'} />;
  if (!courseQ.data || !reviewsQ.data) return <Loading />;

  const course = courseQ.data.course;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">審核課程</h1>
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm" href="/admin/reviews">
          返回
        </Link>
      </div>

      <div className="mt-4 rounded-md border border-slate-200 p-4">
        <div className="text-lg font-semibold text-slate-900">{course.title}</div>
        <div className="mt-1 text-sm text-slate-600">狀態：{course.status}</div>
        <div className="mt-2 text-sm text-slate-700">作者：{course.instructor?.email ?? '-'}</div>
        <div className="mt-2 text-sm text-slate-700">分類：{course.category?.name ?? '-'}</div>
        <div className="mt-4 text-sm text-slate-700 whitespace-pre-wrap">{course.description}</div>
      </div>

      <div className="mt-6">
        <ReviewDecisionForm courseId={courseId} />
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">審核紀錄</h2>
        <ul className="mt-3 space-y-2">
          {reviewsQ.data.reviews.map((r: any) => (
            <li key={r.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="font-medium text-slate-900">{r.decision}</div>
              <div className="text-slate-600">admin: {r.admin?.email ?? '-'}</div>
              {r.reason ? <div className="mt-2 text-slate-700 whitespace-pre-wrap">{r.reason}</div> : null}
              <div className="mt-2 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString()}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
