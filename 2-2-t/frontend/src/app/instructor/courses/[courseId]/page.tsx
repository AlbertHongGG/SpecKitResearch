import { cookies } from 'next/headers';
import { listInstructorCourses } from '../../../../services/instructor';
import { CourseEditor } from './course-editor';

export const dynamic = 'force-dynamic';

export default async function InstructorCourseEditPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const cookie = (await cookies()).toString();
  const data = await listInstructorCourses({ cookie });
  const course = data.items.find((c) => c.id === courseId);

  return <CourseEditor courseId={courseId} initialCourse={course ?? null} />;
}
