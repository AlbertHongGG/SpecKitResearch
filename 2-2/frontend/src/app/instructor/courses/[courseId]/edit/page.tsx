'use client';

import { useForm } from 'react-hook-form';
import { RoleGuard } from '../../../../../components/role-guard';
import { useInstructorCourseDetail, useUpdateCourse, useSubmitCourse } from '../../../../../features/instructor/api';
import { LoadingState, ErrorState } from '../../../../../features/courses/components/states';

export default function EditCoursePage({ params }: { params: { courseId: string } }) {
  const { data, isLoading, error } = useInstructorCourseDetail(params.courseId);
  const update = useUpdateCourse(params.courseId);
  const submit = useSubmitCourse(params.courseId);
  const { register, handleSubmit } = useForm({ values: data ?? {} });

  if (isLoading) return <LoadingState />;
  if (error || !data) return <ErrorState message="載入失敗" />;

  const onSubmit = async (values: any) => {
    await update.mutateAsync({
      title: values.title,
      description: values.description,
      categoryId: values.categoryId,
      price: Number(values.price),
      coverImageUrl: values.coverImageUrl || null,
    });
  };

  return (
    <RoleGuard roles={['instructor', 'admin']}>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">編輯課程</h1>
        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="block text-sm">標題</label>
            <input className="w-full rounded border px-3 py-2" {...register('title')} />
          </div>
          <div>
            <label className="block text-sm">描述</label>
            <textarea className="w-full rounded border px-3 py-2" {...register('description')} />
          </div>
          <div>
            <label className="block text-sm">分類 ID</label>
            <input className="w-full rounded border px-3 py-2" {...register('categoryId')} />
          </div>
          <div>
            <label className="block text-sm">價格</label>
            <input type="number" className="w-full rounded border px-3 py-2" {...register('price')} />
          </div>
          <div>
            <label className="block text-sm">封面圖片 URL</label>
            <input className="w-full rounded border px-3 py-2" {...register('coverImageUrl')} />
          </div>
          <button className="rounded bg-blue-600 px-4 py-2 text-white" type="submit">
            儲存
          </button>
        </form>
        {(data.status === 'draft' || data.status === 'rejected') && (
          <button
            className="rounded bg-purple-600 px-4 py-2 text-white disabled:opacity-50"
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
          >
            提交審核
          </button>
        )}
        {data.status === 'submitted' && <p className="text-sm text-slate-500">審核中，內容鎖定</p>}
      </div>
    </RoleGuard>
  );
}
