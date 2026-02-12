import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import type { Viewer } from "@/lib/auth/session";
import { canModerateBoard } from "@/lib/rbac/permissions";
import { getBoardById } from "@/server/repositories/boardRepository";
import { audit } from "@/server/usecases/auditLog";

export async function reportsResolve(params: {
  req: Request;
  viewer: Viewer;
  reportId: string;
  outcome: "accepted" | "rejected";
  note?: string;
}) {
  const report = await withDbRetry(() => prisma.report.findUnique({ where: { id: params.reportId } }));
  if (!report) throw ApiError.notFound("Report not found");

  // Determine board scope by resolving target.
  let boardId: string;

  if (report.targetType === "thread") {
    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: report.targetId } }));
    if (!thread) throw ApiError.notFound("Target not found");
    boardId = thread.boardId;
  } else if (report.targetType === "post") {
    const post = await withDbRetry(() => prisma.post.findUnique({ where: { id: report.targetId } }));
    if (!post) throw ApiError.notFound("Target not found");
    const thread = await withDbRetry(() => prisma.thread.findUnique({ where: { id: post.threadId } }));
    if (!thread) throw ApiError.notFound("Target not found");
    boardId = thread.boardId;
  } else {
    throw ApiError.internal("Unknown report targetType");
  }

  const board = await getBoardById(boardId);
  if (!board) throw ApiError.notFound("Board not found");
  if (!canModerateBoard(params.viewer, board.id)) throw ApiError.forbidden("權限不足");

  if (report.status !== "pending") {
    // Idempotent-ish: if already resolved, just return current state.
    return {
      report: {
        id: report.id,
        status: report.status,
        targetType: report.targetType,
        targetId: report.targetId,
      },
    };
  }

  const resolvedAt = new Date();

  await withDbRetry(() =>
    prisma.$transaction(async (tx) => {
      await tx.report.update({
        where: { id: report.id },
        data: {
          status: params.outcome,
          resolvedById: params.viewer.user.id,
          resolvedAt,
          note: params.note,
        },
      });

      if (params.outcome === "accepted") {
        if (report.targetType === "thread") {
          await tx.thread.update({
            where: { id: report.targetId },
            data: { status: "hidden" },
          });
        } else {
          await tx.post.update({
            where: { id: report.targetId },
            data: { status: "hidden" },
          });
        }
      }
    }),
  );

  await audit(params.viewer, params.req, {
    action: "report.resolve",
    targetType: "report",
    targetId: report.id,
    metadata: { outcome: params.outcome, boardId: board.id, targetType: report.targetType, targetId: report.targetId },
  });

  return {
    report: {
      id: report.id,
      status: params.outcome,
      targetType: report.targetType,
      targetId: report.targetId,
      resolvedAt: resolvedAt.toISOString(),
    },
  };
}
