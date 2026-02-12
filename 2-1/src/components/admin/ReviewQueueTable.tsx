'use client';

export function ReviewQueueTable({ courses }: { courses: any[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-slate-700">
            <th className="py-2 pr-4">課程</th>
            <th className="py-2 pr-4">作者</th>
            <th className="py-2 pr-4">分類</th>
            <th className="py-2 pr-4">操作</th>
          </tr>
        </thead>
        <tbody>
          {courses.map((c) => (
            <tr key={c.id} className="border-b border-slate-100">
              <td className="py-2 pr-4">
                <div className="font-medium text-slate-900">{c.title}</div>
                <div className="text-xs text-slate-500">{c.id}</div>
              </td>
              <td className="py-2 pr-4">{c.instructor?.email ?? '-'}</td>
              <td className="py-2 pr-4">{c.category?.name ?? '-'}</td>
              <td className="py-2 pr-4">
                <a className="rounded-md border border-slate-300 px-2 py-1" href={`/admin/reviews/${c.id}`}>
                  審核
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
