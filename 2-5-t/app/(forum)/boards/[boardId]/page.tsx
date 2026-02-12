import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/src/infra/db/prisma";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { listThreadsByBoard } from "@/src/usecases/threads/listThreadsByBoard";
import { AuthRequiredAction } from "@/src/ui/components/AuthRequiredAction";
import { ThreadEditor } from "@/src/ui/thread/ThreadEditor";

export default async function BoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>;
}) {
  const { boardId } = await params;

  let data: Awaited<ReturnType<typeof listThreadsByBoard>>;
  try {
    data = await listThreadsByBoard(prisma, boardId, 1, 20);
  } catch (err) {
    if (err instanceof AppError && err.code === ErrorCodes.NotFound) {
      notFound();
    }
    throw err;
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">{data.board.name}</h1>
          {data.board.description ? (
            <p className="mt-2 text-gray-600">{data.board.description}</p>
          ) : null}
        </div>
        {!data.board.isActive ? (
          <span className="rounded bg-neutral-200 px-2 py-1 text-xs text-neutral-700">
            Inactive
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <AuthRequiredAction label="登入後可發文">
          <ThreadEditor
            boardId={boardId}
            disabled={!data.board.isActive}
            disabledReason="此看板已停用，無法發文"
          />
        </AuthRequiredAction>
      </div>

      <div className="mt-6 grid gap-3">
        {data.threads.map((t: { id: string; title: string; status: string }) => (
          <Link
            key={t.id}
            className="rounded-md border px-4 py-3 hover:bg-neutral-50"
            href={`/threads/${t.id}`}
          >
            <div className="text-sm font-medium">{t.title}</div>
            <div className="mt-1 text-xs text-neutral-600">狀態：{t.status}</div>
          </Link>
        ))}
        {data.threads.length === 0 ? (
          <div className="rounded-md border px-4 py-6 text-sm text-neutral-600">
            目前沒有可見的主題。
          </div>
        ) : null}
      </div>
    </main>
  );
}
