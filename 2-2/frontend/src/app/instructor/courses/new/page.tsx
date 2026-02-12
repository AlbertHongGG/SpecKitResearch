'use client';

import { useForm } from 'react-hook-form';
import { RoleGuard } from '../../../../components/role-guard';
import { useCreateCourse } from '../../../../features/instructor/api';

export default function NewCoursePage() {
  const { register, handleSubmit } = useForm();
  const create = useCreateCourse();

  const onSubmit = async (values: any) => {
    await create.mutateAsync({
      title: values.title,
      description: values.description,
      categoryId: values.categoryId,
      price: Number(values.price),
      coverImageUrl: values.coverImageUrl || null,
    });
    window.location.href = '/instructor/courses';
  };

  return (
    <RoleGuard roles={['instructor', 'admin']}>
      <div className="max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">新增課程</h1>
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
            建立
          </button>
        </form>
      </div>
    </RoleGuard>
  );
}
