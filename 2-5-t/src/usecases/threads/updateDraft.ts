import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export type UpdateDraftInput = {
  threadId: string;
  title: string;
  content?: string;
};

export async function updateDraft(prisma: PrismaClient, actor: Actor, input: UpdateDraftInput) {
  requireAuthenticated(actor);

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { id: true, authorId: true, status: true, board: { select: { isActive: true } } },
  });

  if (!thread) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }
  if (thread.authorId !== actor.user.id) {
    throw new AppError(ErrorCodes.Forbidden, "Only author can edit draft");
  }
  if (!thread.board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }
  if (thread.status !== "draft") {
    throw new AppError(ErrorCodes.InvalidTransition, "Only draft can be edited", {
      status: thread.status,
    });
  }

  const updated = await transaction(prisma, async (tx) => {
    const res = await tx.thread.update({
      where: { id: input.threadId },
      data: { title: input.title, content: input.content ?? "" },
      select: { id: true, status: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "thread.update_draft",
      targetType: "thread",
      targetId: res.id,
    });

    return res;
  });

  return { thread: updated };
}
