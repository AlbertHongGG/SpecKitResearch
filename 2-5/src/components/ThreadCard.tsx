import Link from "next/link";
import type { ThreadSummary } from "@/lib/queries/threads";

export function ThreadCard({ thread }: { thread: ThreadSummary }) {
  return (
    <Link
      href={`/threads/${thread.id}`}
      className="block rounded-lg border bg-white p-4 hover:border-slate-300"
    >
      <div className="flex items-center gap-2">
        {thread.isPinned && (
          <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
            置頂
          </span>
        )}
        {thread.isFeatured && (
          <span className="rounded bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">
            精選
          </span>
        )}
        <h3 className="font-medium">{thread.title}</h3>
      </div>
      <div className="mt-2 text-xs text-slate-500">狀態：{thread.status}</div>
    </Link>
  );
}
