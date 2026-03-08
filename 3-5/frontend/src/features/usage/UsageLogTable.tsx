'use client';

import type { UsageLog } from '@/features/usage/usage.queries';

export function UsageLogTable({ logs }: { logs: UsageLog[] }) {
  if (logs.length === 0) {
    return <div className="text-sm text-zinc-600 dark:text-zinc-400">沒有符合條件的紀錄。</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="text-zinc-600 dark:text-zinc-400">
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2 pr-3">時間</th>
            <th className="py-2 pr-3">狀態碼</th>
            <th className="py-2 pr-3">方法</th>
            <th className="py-2 pr-3">Path</th>
            <th className="py-2 pr-3">延遲</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l, idx) => (
            <tr key={`${l.timestamp}-${idx}`} className="border-b border-zinc-100 last:border-0 dark:border-zinc-900">
              <td className="py-2 pr-3 whitespace-nowrap">{new Date(l.timestamp).toLocaleString()}</td>
              <td className="py-2 pr-3 font-medium">{l.status_code}</td>
              <td className="py-2 pr-3 whitespace-nowrap">{l.http_method}</td>
              <td className="py-2 pr-3">
                <div className="max-w-[56ch] truncate" title={l.path}>
                  {l.path}
                </div>
              </td>
              <td className="py-2 pr-3 whitespace-nowrap">{l.response_time_ms} ms</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
