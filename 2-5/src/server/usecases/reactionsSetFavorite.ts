import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canPostToBoard } from "@/lib/rbac/permissions";
import { idempotentCreate } from "@/server/domain/idempotency";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function reactionsSetFavorite(params: {
  req: Request;
  viewer: Viewer;
  threadId: string;
  action: "favorite" | "unfavorite";
}) {
  const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.threadId } }));
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canPostToBoard(params.viewer, board)) throw ApiError.forbidden("看板已停用或權限不足");

  if (!(thread.status === "published" || thread.status === "locked")) {
    throw ApiError.forbidden("不可收藏此主題");
  }

  if (params.action === "favorite") {
    await idempotentCreate(() =>
      withDbRetry(async () => {
        await prisma.favorite.create({
          data: {
            userId: params.viewer.user.id,
            threadId: thread.id,
          },
        });
      }),
    );

    await audit(params.viewer, params.req, {
      action: "reaction.favorite",
      targetType: "thread",
      targetId: thread.id,
      metadata: { boardId: board.id },
    });

    return { favorited: true };
  }

  await withDbRetry(() =>
    prisma.favorite.deleteMany({
      where: {
        userId: params.viewer.user.id,
        threadId: thread.id,
      },
    }),
  );

  await audit(params.viewer, params.req, {
    action: "reaction.unfavorite",
    targetType: "thread",
    targetId: thread.id,
    metadata: { boardId: board.id },
  });

  return { favorited: false };
}
