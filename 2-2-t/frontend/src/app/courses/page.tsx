import { listMarketingCourses } from '../../services/courses';
import { EmptyState } from '../../components/ui/empty-state';
import { CourseCard } from '../../components/courses/course-card';

export const dynamic = 'force-dynamic';

export default async function CoursesPage() {
  const data = await listMarketingCourses();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">課程</h1>
        <p className="mt-1 text-sm text-gray-600">瀏覽已上架的課程。</p>
      </div>

      {data.items.length === 0 ? (
        <EmptyState title="目前沒有已上架課程" description="請稍後再回來看看。" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.items.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}
