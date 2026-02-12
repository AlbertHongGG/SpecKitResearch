import Link from 'next/link';
import { cookies } from 'next/headers';
import { listInstructorCourses } from '../../../services/instructor';
import { CreateCourseCard } from './create-course-card';

export const dynamic = 'force-dynamic';

export default async function InstructorCoursesPage() {
  const cookie = (await cookies()).toString();
  const data = await listInstructorCourses({ cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">我的課程（教師）</h1>
      </div>

      <CreateCourseCard />

      <div className="divide-y rounded-md border">
        {data.items.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-3">
            <div>
              <div className="text-sm font-medium">{c.title}</div>
              <div className="text-xs text-gray-600">狀態：{c.status}</div>
            </div>
            <Link className="text-sm text-blue-600 hover:underline" href={`/instructor/courses/${c.id}`}>
              編輯
            </Link>
          </div>
        ))}
        {data.items.length === 0 ? <div className="p-3 text-sm text-gray-700">尚無課程。</div> : null}
      </div>
    </div>
  );
}
