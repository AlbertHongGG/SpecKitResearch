"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { useSession } from "@/src/ui/auth/useSession";
import { ReportQueue } from "@/src/ui/mod/ReportQueue";

export default function BoardReportsPage() {
  const params = useParams<{ boardId: string }>();
  const boardId = params.boardId;
  const { data: session } = useSession();

  if (!session?.authenticated) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-xl font-semibold">看板檢舉</h1>
        <p className="mt-4 text-sm text-neutral-700">需要登入。</p>
        <Link
          className="mt-2 inline-block text-sm text-blue-700 hover:underline"
          href={`/login?returnTo=${encodeURIComponent(`/mod/boards/${boardId}/reports`)}`}
        >
          前往登入
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">看板檢舉</h1>
        <Link className="text-sm text-blue-700 hover:underline" href="/mod">
          返回
        </Link>
      </div>

      <div className="mt-6">
        <ReportQueue boardId={boardId} />
      </div>
    </main>
  );
}
