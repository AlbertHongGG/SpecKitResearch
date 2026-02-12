import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transitionThread } from "@/src/domain/state-machines/threadState";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function publishDraft(prisma: PrismaClient, actor: Actor, threadId: string) {
  requireAuthenticated(actor);

  const thread = await prisma.thread.findUnique({
    where: { id: threadId },
    select: { id: true, authorId: true, status: true, boardId: true, board: { select: { isActive: true } } },
  });

  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }
  if (thread.authorId !== actor.user.id) {
    throw new AppError(ErrorCodes.Forbidden, "Only author can publish");
  }
  if (!thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }

  const next = transitionThread(thread.status, "published");

  const updated = await transaction(prisma, async (tx) => {
    const res = await tx.thread.update({
      where: { id: threadId },
      data: { status: next, publishedAt: new Date() },
      select: { id: true, status: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "thread.publish",
      targetType: "thread",
      targetId: res.id,
      metadata: { boardId: thread.boardId },
    });

    return res;
  });

  return { thread: updated };
}
