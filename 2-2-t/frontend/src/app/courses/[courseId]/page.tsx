import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getMarketingCourseDetail } from '../../../services/courses';
import { isApiError } from '../../../services/api-client';
import { CourseOutline } from '../../../components/courses/course-outline';
import { PurchaseCta } from '../../../components/courses/purchase-cta';

export const dynamic = 'force-dynamic';

export default async function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;

  try {
    const cookie = (await cookies()).toString();
    const data = await getMarketingCourseDetail(courseId, { cookie });

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{data.course.title}</h1>
          <p className="mt-1 text-gray-600">{data.course.description}</p>
          <div className="mt-3 text-sm text-gray-700">講師：{data.course.instructor.email}</div>
          <div className="mt-2 text-base font-medium">NT$ {data.course.price}</div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">課綱</h2>
          <div className="mt-3">
            <CourseOutline outline={data.outline} />
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold">購買</h2>
          <div className="mt-3">
            <PurchaseCta courseId={data.course.id} isPurchased={data.viewer.isPurchased} />
          </div>
        </div>
      </div>
    );
  } catch (err) {
    if (isApiError(err) && err.status === 404) return notFound();
    throw err;
  }
}
