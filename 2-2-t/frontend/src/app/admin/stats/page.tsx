import { cookies } from 'next/headers';
import { getAdminStats } from '../../../services/admin';

export const dynamic = 'force-dynamic';

export default async function AdminStatsPage() {
  const cookie = (await cookies()).toString();
  const data = await getAdminStats({ cookie });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">統計</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="rounded-md border p-4">
            <div className="text-xs text-gray-600">{k}</div>
            <div className="mt-2 text-2xl font-semibold">{String(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
