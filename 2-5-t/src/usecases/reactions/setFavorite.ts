import type { PrismaClient } from "@prisma/client";

import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import type { Actor } from "@/src/domain/policies/rbac";
import { requireAuthenticated } from "@/src/domain/policies/antiIdor";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function setFavorite(
  prisma: PrismaClient,
  actor: Actor,
  input: { threadId: string; desired: boolean },
) {
  requireAuthenticated(actor);

  const thread = await prisma.thread.findUnique({
    where: { id: input.threadId },
    select: { id: true, boardId: true, status: true, board: { select: { isActive: true } } },
  });
  if (!thread) throw new AppError(ErrorCodes.NotFound, "Thread not found");
  if (!thread.board.isActive) throw new AppError(ErrorCodes.Forbidden, "Board is inactive");
  if (!["published", "locked"].includes(thread.status)) {
    throw new AppError(ErrorCodes.NotFound, "Thread not found");
  }

  const changed = await transaction(prisma, async (tx) => {
    if (input.desired) {
      await tx.favorite.upsert({
        where: {
          userId_threadId: {
            userId: actor.user.id,
            threadId: input.threadId,
          },
        },
        create: { userId: actor.user.id, threadId: input.threadId },
        update: {},
      });

      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "favorite.set_true",
        targetType: "thread",
        targetId: input.threadId,
        metadata: { boardId: thread.boardId },
      });

      return true;
    }

    const res = await tx.favorite.deleteMany({
      where: { userId: actor.user.id, threadId: input.threadId },
    });

    if (res.count > 0) {
      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "favorite.set_false",
        targetType: "thread",
        targetId: input.threadId,
        metadata: { boardId: thread.boardId },
      });
    }

    return res.count > 0;
  });

  return { isFavorited: input.desired ? true : false, changed };
}
