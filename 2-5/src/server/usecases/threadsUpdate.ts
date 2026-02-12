import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canEditThread, canPostToBoard } from "@/lib/rbac/permissions";
import { assertThreadNotLocked } from "@/server/domain/threadState";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function threadsUpdate(params: {
  req: Request;
  viewer: Viewer;
  threadId: string;
  patch: { title?: string; content?: string };
}) {
  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  if (!canEditThread(params.viewer, thread)) throw ApiError.forbidden();
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");
  assertThreadNotLocked(thread.status as any);

  if (thread.status === "hidden") throw ApiError.forbidden("隱藏的主題不可編輯");

  const nextTitle = params.patch.title ?? thread.title;
  const nextContent = params.patch.content ?? thread.content;

  const updated = await withDbRetry(() =>
    prisma.thread.update({
      where: { id: thread.id },
      data: {
        title: nextTitle,
        content: nextContent,
      },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "thread.update",
    targetType: "thread",
    targetId: thread.id,
    metadata: { changed: Object.keys(params.patch) },
  });

  return { thread: updated };
}
