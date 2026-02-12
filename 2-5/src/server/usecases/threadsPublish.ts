import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canPostToBoard } from "@/lib/rbac/permissions";
import { assertThreadStatusTransitionAllowed } from "@/server/domain/threadState";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function threadsPublish(params: { req: Request; viewer: Viewer; threadId: string }) {
  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");

  if (thread.authorId !== params.viewer.user.id) throw ApiError.forbidden("只有作者可以發布");

  assertThreadStatusTransitionAllowed(thread.status as any, "published");

  const updated = await withDbRetry(() =>
    prisma.thread.update({
      where: { id: thread.id },
      data: { status: "published" },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "thread.publish",
    targetType: "thread",
    targetId: thread.id,
    metadata: { from: thread.status, to: "published" },
  });

  return { thread: updated };
}
