import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getMyCourseReader } from '../../../../services/my-courses';
import { isApiError } from '../../../../services/api-client';
import { CourseReader } from '../../../../components/reader/course-reader';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const { courseId } = await params;
  const { lessonId } = await searchParams;

  const cookie = (await cookies()).toString();
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

  try {
    const data = await getMyCourseReader({ courseId, lessonId, cookie });
    return <CourseReader data={data} apiBaseUrl={apiBaseUrl} />;
  } catch (err) {
    if (isApiError(err) && err.status === 404) return notFound();
    throw err;
  }
}
