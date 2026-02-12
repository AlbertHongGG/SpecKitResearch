'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { CourseForm } from '@/components/instructor/CourseForm';
import { FileUpload } from '@/components/instructor/FileUpload';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';
import { taxonomyClient } from '@/services/taxonomyClient';

export default function EditCoursePage() {
  const { courseId } = useParams() as { courseId: string };

  const qc = useQueryClient();

  const courseQ = useQuery({
    queryKey: queryKeys.instructorCourse(courseId),
    queryFn: () => instructorClient.getCourse(courseId),
  });

  const categoriesQ = useQuery({ queryKey: [queryKeys.taxonomy(), 'categories'], queryFn: taxonomyClient.categories });
  const tagsQ = useQuery({ queryKey: [queryKeys.taxonomy(), 'tags'], queryFn: taxonomyClient.tags });

  if (courseQ.isLoading || categoriesQ.isLoading || tagsQ.isLoading) return <Loading />;
  if (courseQ.isError) return <InlineError message={(courseQ.error as any)?.message ?? '載入失敗'} />;
  if (categoriesQ.isError) return <InlineError message={(categoriesQ.error as any)?.message ?? '載入失敗'} />;
  if (tagsQ.isError) return <InlineError message={(tagsQ.error as any)?.message ?? '載入失敗'} />;
  if (!courseQ.data || !categoriesQ.data || !tagsQ.data) return <Loading />;

  const course = courseQ.data.course;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">編輯課程</h1>
        <Link className="rounded-md border border-slate-300 px-3 py-2 text-sm" href={`/instructor/courses/${courseId}/curriculum`}>
          編輯課綱
        </Link>
      </div>

      <div className="mt-2 text-sm text-slate-600">狀態：{course.status}</div>
      {course.rejectedReason ? <div className="mt-2 text-sm text-red-700">駁回原因：{course.rejectedReason}</div> : null}

      <div className="mt-6">
        <CourseForm
          categories={categoriesQ.data.categories.map((c) => ({ categoryId: c.categoryId, name: c.name }))}
          tags={tagsQ.data.tags.map((t) => ({ tagId: t.tagId, name: t.name }))}
          initial={{
            categoryId: course.categoryId,
            title: course.title,
            description: course.description,
            price: course.price,
          }}
          submitLabel="儲存"
          onSubmit={async (values) => {
            await instructorClient.updateCourse(courseId, values);
            await qc.invalidateQueries({ queryKey: queryKeys.instructorCourse(courseId) });
            window.alert('已儲存');
          }}
        />
      </div>

      <div className="mt-8">
        <FileUpload
          label="上傳封面圖片"
          meta={{ courseId }}
          accept="image/*"
          onUploaded={async (v) => {
            await instructorClient.updateCourse(courseId, { coverFileId: v.fileId });
            await qc.invalidateQueries({ queryKey: queryKeys.instructorCourse(courseId) });
            window.alert('已更新封面');
          }}
        />
      </div>
    </div>
  );
}
