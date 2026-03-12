import Link from 'next/link';
import type { ReactNode } from 'react';

export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="grid gap-6 md:grid-cols-[240px_1fr]">
      <aside className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-900">Project</div>
        <div className="mt-1 break-all text-xs text-slate-500">{projectId}</div>

        <nav className="mt-4 flex flex-col gap-2 text-sm">
          <Link href="/projects" className="text-slate-700 hover:text-slate-900">
            ← 回專案列表
          </Link>
          <Link
            href={`/projects/${projectId}/board`}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            看板
          </Link>
          <Link
            href={`/projects/${projectId}/activity`}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            Activity
          </Link>
          <Link
            href={`/projects/${projectId}/members`}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            成員
          </Link>
          <Link
            href={`/projects/${projectId}/settings`}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            設定
          </Link>
          <Link
            href={`/projects/${projectId}/archived`}
            className="rounded-md px-2 py-1 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          >
            封存
          </Link>
        </nav>
      </aside>

      <main>{children}</main>
    </div>
  );
}

