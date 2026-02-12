import { cookies, headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { listMyCourses } from '../../../services/my-courses';
import { EmptyState } from '../../../components/ui/empty-state';
import { isApiError } from '../../../services/api-client';

export const dynamic = 'force-dynamic';

export default async function MyCoursesPage() {
  const cookie = (await cookies()).toString();
  const pathname = (await headers()).get('x-pathname') || '/my-courses';

  let data: Awaited<ReturnType<typeof listMyCourses>>;
  try {
    data = await listMyCourses({ cookie });
  } catch (err) {
    if (isApiError(err) && err.status === 401) redirect(`/login?redirect=${encodeURIComponent(pathname)}`);
    if (isApiError(err) && err.status === 403) redirect('/403');
    throw err;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">我的課程</h1>
        <p className="mt-1 text-sm text-gray-600">你已購買的課程與學習進度。</p>
      </div>

      {data.items.length === 0 ? (
        <EmptyState
          title="你還沒有購買任何課程"
          description="前往課程列表挑選喜歡的課程。"
          action={
            <Link href="/courses" className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-black/90">
              瀏覽課程
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {data.items.map((it) => (
            <Link key={it.course.id} href={`/my-courses/${it.course.id}`} className="block rounded-lg border p-4 hover:bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-base font-semibold">{it.course.title}</div>
                  <div className="mt-1 text-sm text-gray-600 line-clamp-2">{it.course.description}</div>
                </div>
                <div className="text-right text-sm text-gray-700">
                  <div>
                    進度 {it.progress.completedLessons}/{it.progress.totalLessons}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
