import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canModerateBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

async function getPostThreadBoard(postId: string) {
  const post = await withDbRetry(() => prisma.post.findUnique({ where: { id: postId } }));
  if (!post) throw ApiError.notFound("Post not found");

  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: post.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  return { post, thread, board };
}

export async function postsHide(params: { req: Request; viewer: Viewer; postId: string }) {
  const { post, thread, board } = await getPostThreadBoard(params.postId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (post.status !== "hidden") {
    await withDbRetry(() => prisma.post.update({ where: { id: post.id }, data: { status: "hidden" } }));
  }

  await audit(params.viewer, params.req, {
    action: "post.hide",
    targetType: "post",
    targetId: post.id,
    metadata: { boardId: board.id, threadId: thread.id },
  });

  return { ok: true };
}

export async function postsRestore(params: { req: Request; viewer: Viewer; postId: string }) {
  const { post, thread, board } = await getPostThreadBoard(params.postId);
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (post.status !== "visible") {
    await withDbRetry(() => prisma.post.update({ where: { id: post.id }, data: { status: "visible" } }));
  }

  await audit(params.viewer, params.req, {
    action: "post.restore",
    targetType: "post",
    targetId: post.id,
    metadata: { boardId: board.id, threadId: thread.id },
  });

  return { ok: true };
}
