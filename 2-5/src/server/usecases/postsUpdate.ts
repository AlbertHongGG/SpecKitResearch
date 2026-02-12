import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { isAdmin } from "@/lib/rbac/roles";
import { canPostToBoard } from "@/lib/rbac/permissions";
import { assertThreadNotLocked } from "@/server/domain/threadState";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function postsUpdate(params: { req: Request; viewer: Viewer; postId: string; content: string }) {
  const post = await withDbRetry(() => prisma.post.findUnique({ where: { id: params.postId } }));
  if (!post) throw ApiError.notFound("Post not found");

  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: post.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");
  assertThreadNotLocked(thread.status as any);

  const canEdit = isAdmin(params.viewer) || post.authorId === params.viewer.user.id;
  if (!canEdit) throw ApiError.forbidden();

  const updated = await withDbRetry(() =>
    prisma.post.update({
      where: { id: post.id },
      data: { content: params.content },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "post.update",
    targetType: "post",
    targetId: post.id,
    metadata: { threadId: thread.id },
  });

  return { post: updated };
}
