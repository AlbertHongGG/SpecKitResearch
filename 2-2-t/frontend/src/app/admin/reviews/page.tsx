import Link from 'next/link';
import { cookies } from 'next/headers';
import { listReviewQueue } from '../../../services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminReviewsPage() {
  const cookie = (await cookies()).toString();
  const data = await listReviewQueue({ cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">審核佇列</h1>
        <p className="mt-1 text-sm text-gray-600">待審核的 submitted 課程。</p>
      </div>

      {data.items.length ? (
        <div className="divide-y rounded-md border">
          {data.items.map((c) => (
            <div key={c.id} className="flex items-center justify-between p-3">
              <div>
                <div className="text-sm font-medium">{c.title}</div>
                <div className="text-xs text-gray-600">講師：{c.instructor.email}</div>
              </div>
              <Link className="text-sm text-blue-600 hover:underline" href={`/admin/reviews/${c.id}`}>
                開啟
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border p-4 text-sm text-gray-700">目前沒有待審核課程。</div>
      )}
    </div>
  );
}
