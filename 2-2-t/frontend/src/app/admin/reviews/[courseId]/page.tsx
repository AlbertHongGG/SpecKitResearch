import { cookies } from 'next/headers';
import { getReviewHistory } from '../../../../services/admin';
import { DecisionForm } from './decision-form';

export const dynamic = 'force-dynamic';

export default async function AdminReviewDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const cookie = (await cookies()).toString();
  const history = await getReviewHistory(courseId, { cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">課程審核</h1>
        <p className="mt-1 text-sm text-gray-600">Course ID: {courseId}</p>
      </div>

      <DecisionForm courseId={courseId} />

      <div className="space-y-2">
        <div className="text-sm font-semibold">歷史紀錄</div>
        {history.items.length ? (
          <div className="divide-y rounded-md border">
            {history.items.map((r) => (
              <div key={r.id} className="p-3 text-sm">
                <div className="font-medium">{r.decision}</div>
                {r.reason ? <div className="mt-1 text-gray-700">理由：{r.reason}</div> : null}
                {r.note ? <div className="mt-1 text-gray-700">備註：{r.note}</div> : null}
                <div className="mt-1 text-xs text-gray-500">
                  {r.createdAt} · {r.reviewer.email}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border p-4 text-sm text-gray-700">尚無審核紀錄。</div>
        )}
      </div>
    </div>
  );
}
