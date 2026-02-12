import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { getBoard } from "@/src/infra/repos/boardRepo";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export type CreateDraftInput = {
  boardId: string;
  title: string;
  content?: string;
};

export async function createDraft(prisma: PrismaClient, actor: Actor, input: CreateDraftInput) {
  requireAuthenticated(actor);

  const board = await getBoard(prisma, input.boardId);
  if (!board) {
    throw new AppError(ErrorCodes.NotFound, "Board not found");
  }
  if (!board.isActive) {
    throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  }

  const thread = await transaction(prisma, async (tx) => {
    const created = await tx.thread.create({
      data: {
        boardId: input.boardId,
        authorId: actor.user.id,
        title: input.title,
        content: input.content ?? "",
        status: "draft",
      },
      select: { id: true, status: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "thread.create_draft",
      targetType: "thread",
      targetId: created.id,
      metadata: { boardId: input.boardId },
    });

    return created;
  });

  return { thread };
}
