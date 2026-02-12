import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canModerateBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

async function getThreadAndBoard(threadId: string) {
  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  return { thread, board };
}

export async function threadsHide(params: { req: Request; viewer: Viewer; threadId: string }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (thread.status === "draft") throw ApiError.conflict("不可隱藏草稿");

  if (thread.status !== "hidden") {
    await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { status: "hidden" } }));
  }

  await audit(params.viewer, params.req, {
    action: "thread.hide",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id },
  });

  return { ok: true };
}

export async function threadsRestore(params: { req: Request; viewer: Viewer; threadId: string }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (thread.status === "hidden") {
    await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { status: "published" } }));
  }

  await audit(params.viewer, params.req, {
    action: "thread.restore",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id },
  });

  return { ok: true };
}
