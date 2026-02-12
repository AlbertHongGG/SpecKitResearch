import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canPostToBoard } from "@/lib/rbac/permissions";
import { idempotentCreate } from "@/server/domain/idempotency";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function reactionsSetLike(params: {
  req: Request;
  viewer: Viewer;
  targetType: "thread" | "post";
  targetId: string;
  action: "like" | "unlike";
}) {
  let boardId: string;

  if (params.targetType === "thread") {
    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.targetId } }));
    if (!thread) throw ApiError.notFound("Thread not found");
    boardId = thread.boardId;

    if (!(thread.status === "published" || thread.status === "locked")) {
      throw ApiError.forbidden("不可對此主題按讚");
    }
  } else {
    const post = await withDbRetry(() => prisma.post.findUnique({ where: { id: params.targetId } }));
    if (!post) throw ApiError.notFound("Post not found");

    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: post.threadId } }));
    if (!thread) throw ApiError.notFound("Thread not found");
    boardId = thread.boardId;

    if (!(thread.status === "published" || thread.status === "locked")) {
      throw ApiError.forbidden("不可對此回覆按讚");
    }
    if (post.status !== "visible") throw ApiError.forbidden("不可對此回覆按讚");
  }

  const board = await getBoardById(boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");

  if (params.action === "like") {
    await idempotentCreate(() =>
      withDbRetry(async () => {
        await prisma.like.create({
          data: {
            userId: params.viewer.user.id,
            targetType: params.targetType,
            targetId: params.targetId,
          },
        });
      }),
    );

    await audit(params.viewer, params.req, {
      action: "reaction.like",
      targetType: params.targetType,
      targetId: params.targetId,
      metadata: { boardId },
    });

    return { liked: true };
  }

  await withDbRetry(() =>
    prisma.like.deleteMany({
      where: {
        userId: params.viewer.user.id,
        targetType: params.targetType,
        targetId: params.targetId,
      },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "reaction.unlike",
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: { boardId },
  });

  return { liked: false };
}
