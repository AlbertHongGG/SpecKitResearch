'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { CurriculumEditor } from '@/components/instructor/CurriculumEditor';
import { FileUpload } from '@/components/instructor/FileUpload';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';

export default function CurriculumPage() {
  const { courseId } = useParams() as { courseId: string };

  const q = useQuery({ queryKey: queryKeys.instructorCourse(courseId), queryFn: () => instructorClient.getCourse(courseId) });

  if (q.isLoading) return <Loading />;
  if (q.isError) return <InlineError message={(q.error as any)?.message ?? '載入失敗'} />;
  if (!q.data) return <Loading />;

  const course = q.data.course;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">編輯課綱</h1>
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm" href={`/instructor/courses/${courseId}/edit`}>
          返回基本資訊
        </Link>
      </div>

      <div className="mt-2 text-sm text-slate-600">課程：{course.title}</div>

      <div className="mt-6">
        <FileUpload
          label="先上傳圖片/PDF（取得 fileId，貼到新增單元）"
          meta={{ courseId }}
          accept="image/*,application/pdf"
          onUploaded={(v) => window.alert(`上傳成功：${v.fileId}`)}
        />
      </div>

      <div className="mt-6">
        <CurriculumEditor courseId={courseId} course={course} />
      </div>
    </div>
  );
}
