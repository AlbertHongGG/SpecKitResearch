import Link from "next/link";
import type { Board } from "@/lib/queries/boards";

export function BoardCard({ board }: { board: Board }) {
  return (
    <Link
      href={`/boards/${board.id}`}
      className="block rounded-lg border bg-white p-4 hover:border-slate-300"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{board.name}</h2>
        {!board.isActive && (
          <span className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-700">
            已停用（唯讀）
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-slate-600">{board.description}</p>
    </Link>
  );
}
