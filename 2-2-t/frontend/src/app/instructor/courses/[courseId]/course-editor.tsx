'use client';

import { useEffect, useState } from 'react';
import { Alert } from '../../../../components/ui/alert';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { isApiError } from '../../../../services/api-client';
import { updateInstructorCourse, type InstructorCourseItem } from '../../../../services/instructor';
import { CurriculumEditor } from '../../../../components/instructor/curriculum-editor';
import { CourseStatusActions } from '../../../../components/instructor/course-status-actions';

export function CourseEditor({ courseId, initialCourse }: { courseId: string; initialCourse: InstructorCourseItem | null }) {
  const [course, setCourse] = useState<InstructorCourseItem | null>(initialCourse);
  const [title, setTitle] = useState(initialCourse?.title ?? '');
  const [description, setDescription] = useState(initialCourse?.description ?? '');
  const [price, setPrice] = useState(String(initialCourse?.price ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setCourse(initialCourse);
  }, [initialCourse]);

  if (!course) {
    return (
      <div className="rounded-md border p-4 text-sm text-gray-700">
        找不到課程或你沒有權限。
      </div>
    );
  }

  const locked = course.status === 'submitted';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">編輯課程</h1>
        <p className="mt-1 text-sm text-gray-600">Course ID: {courseId}</p>
      </div>

      {error ? <Alert variant="error">{error}</Alert> : null}

      <div className="rounded-md border p-4 space-y-3">
        <div className="text-sm font-semibold">基本資訊</div>
        <form
          className="grid gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setSubmitting(true);
            try {
              const res = await updateInstructorCourse(courseId, {
                title,
                description,
                price: Number(price),
              });
              setCourse((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  status: res.status as InstructorCourseItem['status'],
                  title,
                  description,
                  price: Number(price),
                };
              });
            } catch (err) {
              if (isApiError(err)) setError(err.message);
              else setError('更新失敗');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          <Input label="標題" value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} required />
          <Input label="簡介" value={description} onChange={(e) => setDescription(e.target.value)} disabled={locked} required />
          <Input label="價格" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} disabled={locked} required />
          <Button type="submit" disabled={submitting || locked}>
            {submitting ? '更新中…' : '更新'}
          </Button>
        </form>
      </div>

      <CourseStatusActions courseId={courseId} status={course.status} />
      <CurriculumEditor courseId={courseId} locked={locked} />
    </div>
  );
}
