'use client';

import { useQuery } from '@tanstack/react-query';

import { CourseForm } from '@/components/instructor/CourseForm';
import { FileUpload } from '@/components/instructor/FileUpload';
import { InlineError } from '@/components/ui/InlineError';
import { Loading } from '@/components/ui/Loading';
import { queryKeys } from '@/lib/queryKeys';
import { instructorClient } from '@/services/instructorClient';
import { taxonomyClient } from '@/services/taxonomyClient';

export default function NewCoursePage() {
  const categoriesQ = useQuery({ queryKey: [queryKeys.taxonomy(), 'categories'], queryFn: taxonomyClient.categories });
  const tagsQ = useQuery({ queryKey: [queryKeys.taxonomy(), 'tags'], queryFn: taxonomyClient.tags });

  if (categoriesQ.isLoading || tagsQ.isLoading) return <Loading />;
  if (categoriesQ.isError) return <InlineError message={(categoriesQ.error as any)?.message ?? '載入失敗'} />;
  if (tagsQ.isError) return <InlineError message={(tagsQ.error as any)?.message ?? '載入失敗'} />;
  if (!categoriesQ.data || !tagsQ.data) return <Loading />;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold text-slate-900">新增課程</h1>

      <div className="mt-6">
        <CourseForm
          categories={categoriesQ.data.categories}
          tags={tagsQ.data.tags}
          submitLabel="建立"
          onSubmit={async (values) => {
            const res = await instructorClient.createCourse(values);
            window.location.href = `/instructor/courses/${res.courseId}/edit`;
          }}
        />
      </div>

      <div className="mt-8">
        <FileUpload
          label="（可選）先上傳封面圖片，稍後在編輯頁綁定"
          accept="image/*"
          onUploaded={(v) => {
            window.alert(`上傳成功：${v.fileId}`);
          }}
        />
      </div>
    </div>
  );
}
