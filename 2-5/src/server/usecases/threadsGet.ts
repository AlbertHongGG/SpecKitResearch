import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canEditThread, canModerateBoard, canReplyToThread } from "@/lib/rbac/permissions";
import { canViewThread } from "@/server/domain/visibility";
import { getBoardById } from "@/server/repositories/boardRepository";

export async function threadsGet(params: { threadId: string; viewer: Viewer | null }) {
  const thread = await withDbRetry(() =>
    prisma.thread.findUnique({
      where: { id: params.threadId },
    }),
  );
  if (!thread) throw ApiError.notFound("Thread not found");

  const board = await getBoardById(thread.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  if (!canViewThread(params.viewer, board, thread)) {
    // 防止資訊洩漏：不可見時回 404
    throw ApiError.notFound("Thread not found");
  }

  const viewerInfo = {
    canReply: canReplyToThread(params.viewer, board, thread),
    canEdit: canEditThread(params.viewer, thread) && thread.status !== "locked",
    canModerate: canModerateBoard(params.viewer, board.id),
  };

  let reactions = { liked: false, favorited: false };
  if (params.viewer) {
    const [liked, favorited] = await Promise.all([
      withDbRetry(() =>
        prisma.like.findFirst({
          where: {
            userId: params.viewer!.user.id,
            targetType: "thread",
            targetId: thread.id,
          },
          select: { id: true },
        }),
      ),
      withDbRetry(() =>
        prisma.favorite.findFirst({
          where: {
            userId: params.viewer!.user.id,
            threadId: thread.id,
          },
          select: { id: true },
        }),
      ),
    ]);

    reactions = { liked: !!liked, favorited: !!favorited };
  }

  return { board, thread, viewer: viewerInfo, reactions };
}
