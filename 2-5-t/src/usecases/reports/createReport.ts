import type { PrismaClient, TargetType } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function createReport(
  prisma: PrismaClient,
  actor: Actor,
  input: { targetType: TargetType; targetId: string; reason: string },
) {
  requireAuthenticated(actor);

  const boardId =
    input.targetType === "thread"
      ? await resolveBoardIdForThread(prisma, input.targetId)
      : await resolveBoardIdForPost(prisma, input.targetId);

  if (!boardId) {
    throw new AppError(ErrorCodes.NotFound, "Target not found");
  }

  return transaction(prisma, async (tx) => {
    try {
      const created = await tx.report.create({
        data: {
          reporterId: actor.user.id,
          boardId,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
        },
        select: { id: true, status: true },
      });

      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "report.create",
        targetType: "report",
        targetId: created.id,
        metadata: { boardId, targetType: input.targetType, targetId: input.targetId },
      });

      return { report: created };
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new AppError(ErrorCodes.Conflict, "Duplicate report");
      }
      throw err;
    }
  });
}

async function resolveBoardIdForThread(prisma: PrismaClient, threadId: string) {
  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, boardId: true, status: true, board: { select: { isActive: true } } },
  });

  if (!thread) return null;
  if (!thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }

  // Only allow reporting content that is visible to the reporter.
  if (!(["published", "locked"] as const).includes(thread.status)) {
    return null;
  }

  return thread.boardId;
}

async function resolveBoardIdForPost(prisma: PrismaClient, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      status: true,
      thread: { select: { id: true, boardId: true, status: true, board: { select: { isActive: true } } } },
    },
  });

  if (!post) return null;
  if (!post.thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }

  if (!(["published", "locked"] as const).includes(post.thread.status) || post.status !== "visible") {
    return null;
  }

  return post.thread.boardId;
}
