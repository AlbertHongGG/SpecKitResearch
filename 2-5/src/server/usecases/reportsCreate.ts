import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canViewPost, canViewThread } from "@/server/domain/visibility";
import { getBoardById } from "@/server/repositories/boardRepository";
import { idempotentCreateWithFallback } from "@/server/domain/idempotency";
import { audit } from "@/server/usecases/auditLog";

export async function reportsCreate(params: {
  req: Request;
  viewer: Viewer;
  targetType: "thread" | "post";
  targetId: string;
  reason: string;
}) {
  if (params.viewer.user.isBanned) throw ApiError.forbidden("帳號已停權");

  let boardId: string;

  if (params.targetType === "thread") {
    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: params.targetId } }));
    if (!thread) throw ApiError.notFound("內容不存在");

    const board = await getBoardById(thread.boardId);
    if (!board) throw ApiError.notFound("Board not found");
    if (!board.isActive) throw ApiError.forbidden("看板已停用");

    if (!canViewThread(params.viewer, board, thread)) {
      throw ApiError.notFound("內容不存在");
    }

    boardId = board.id;
  } else {
    const post = await withDbRetry(() => prisma.post.findUnique({ where: { id: params.targetId } }));
    if (!post) throw ApiError.notFound("內容不存在");

    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: post.threadId } }));
    if (!thread) throw ApiError.notFound("內容不存在");

    const board = await getBoardById(thread.boardId);
    if (!board) throw ApiError.notFound("Board not found");
    if (!board.isActive) throw ApiError.forbidden("看板已停用");

    if (!canViewPost(params.viewer, board, thread, post)) {
      throw ApiError.notFound("內容不存在");
    }

    boardId = board.id;
  }

  const { created, value: report } = await idempotentCreateWithFallback({
    create: async () =>
      withDbRetry(() =>
        prisma.report.create({
          data: {
            reporterId: params.viewer.user.id,
            targetType: params.targetType,
            targetId: params.targetId,
            reason: params.reason,
            status: "pending",
          },
        }),
      ),
    getExisting: async () =>
      withDbRetry(() =>
        prisma.report.findFirst({
          where: {
            reporterId: params.viewer.user.id,
            targetType: params.targetType,
            targetId: params.targetId,
          },
        }),
      ),
  });

  await audit(params.viewer, params.req, {
    action: "report.create",
    targetType: "report",
    targetId: report.id,
    metadata: { created, boardId, targetType: params.targetType, targetId: params.targetId },
  });

  return {
    created,
    report: {
      id: report.id,
      targetType: report.targetType as "thread" | "post",
      targetId: report.targetId,
      reason: report.reason,
      status: report.status as "pending" | "accepted" | "rejected",
      createdAt: report.createdAt,
    },
  };
}
