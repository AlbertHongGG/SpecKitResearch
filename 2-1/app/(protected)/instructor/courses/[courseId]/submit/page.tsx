'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';

export default function SubmitCoursePage() {
  const { courseId } = useParams() as { courseId: string };

  const q = useQuery({ queryKey: queryKeys.instructorCourse(courseId), queryFn: () => instructorClient.getCourse(courseId) });

  const submitM = useMutation({
    mutationFn: () => instructorClient.submitCourse(courseId),
    onSuccess: () => {
      window.alert('已送審');
      window.location.href = '/instructor/courses';
    },
  });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? '載入失敗'} />;
  if (!q.data) return <Loading />;

  const course = q.data.course;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">送審</h1>

      <div className="mt-2 rounded-md border border-slate-200 p-3 text-sm">
        <div className="font-medium">{course.title}</div>
        <div className="text-slate-600">狀態：{course.status}</div>
        {course.rejectedReason ? <div className="mt-2 text-red-700">駁回原因：{course.rejectedReason}</div> : null}
      </div>

      {submitM.isError ? <div className="mt-4"><InlineError message={(submitM.error as any)?.message ?? '送審失敗'} /></div> : null}

      <div className="mt-6">
        <Button type="button" onClick={() => submitM.mutate()} disabled={submitM.isPending}>
          {submitM.isPending ? '送審中…' : '送審'}
        </Button>
      </div>

      <div className="mt-4 text-sm text-slate-600">
        提示：送審會檢查至少一個章節/單元，且單元內容需符合 text/image/pdf 一致性。
      </div>
    </div>
  );
}
