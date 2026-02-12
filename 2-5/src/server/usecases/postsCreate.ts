import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canReplyToThread } from "@/lib/rbac/permissions";
import { assertThreadNotLocked } from "@/server/domain/threadState";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function postsCreate(params: { req: Request; viewer: Viewer; threadId: string; content: string }) {
  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  if (!canReplyToThread(params.viewer, board, thread)) throw ApiError.forbidden("不可回覆此主題");
  assertThreadNotLocked(thread.status as any);

  const post = await withDbRetry(() =>
    prisma.post.create({
      data: {
        threadId: thread.id,
        authorId: params.viewer.user.id,
        content: params.content,
        status: "visible",
      },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "post.create",
    targetType: "post",
    targetId: post.id,
    metadata: { threadId: thread.id },
  });

  return { post };
}
