'use client';

import { RoleGuard } from '../../../components/role-guard';
import { useStats } from '../../../features/admin/api';
import { LoadingState, ErrorState } from '../../../features/courses/components/states';

export default function AdminStatsPage() {
  const { data, isLoading, error } = useStats();

  return (
    <RoleGuard roles={['admin']}>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">平台統計</h1>
        {isLoading && <LoadingState />}
        {error && <ErrorState message="載入失敗" />}
        {data && (
          <div className="rounded border bg-white p-4 space-y-2">
            <div>使用者數量：{data.userCount}</div>
            <div>購買數量：{data.purchaseCount}</div>
            <div>
              課程狀態：
              <ul className="ml-4 list-disc">
                {Object.entries(data.courseCounts).map(([status, count]) => (
                  <li key={status}>
                    {status}: {count as number}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
