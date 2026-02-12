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

export async function threadsLock(params: { req: Request; viewer: Viewer; threadId: string }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (thread.status === "hidden") throw ApiError.conflict("請先還原主題後再鎖定");
  if (thread.status === "draft") throw ApiError.conflict("不可鎖定草稿");

  if (thread.status !== "locked") {
    await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { status: "locked" } }));
  }

  await audit(params.viewer, params.req, {
    action: "thread.lock",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id },
  });

  return { ok: true };
}

export async function threadsUnlock(params: { req: Request; viewer: Viewer; threadId: string }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (thread.status === "locked") {
    await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { status: "published" } }));
  }

  await audit(params.viewer, params.req, {
    action: "thread.unlock",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id },
  });

  return { ok: true };
}

export async function threadsSetPinned(params: { req: Request; viewer: Viewer; threadId: string; pinned: boolean }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { isPinned: params.pinned } }));

  await audit(params.viewer, params.req, {
    action: "thread.setPinned",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id, pinned: params.pinned },
  });

  return { ok: true };
}

export async function threadsSetFeatured(params: { req: Request; viewer: Viewer; threadId: string; featured: boolean }) {
  const { thread, board } = await getThreadAndBoard(params.threadId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  await withDbRetry(() => prisma.thread.update({ where: { id: thread.id }, data: { isFeatured: params.featured } }));

  await audit(params.viewer, params.req, {
    action: "thread.setFeatured",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id, featured: params.featured },
  });

  return { ok: true };
}
