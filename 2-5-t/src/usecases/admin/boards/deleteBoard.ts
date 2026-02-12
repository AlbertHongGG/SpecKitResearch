import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function deleteBoard(prisma: PrismaClient, actor: Actor, boardId: string) {
  requireAdmin(actor);

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, name: true, _count: { select: { threads: true } } },
  });
  if (!board) throw new AppError(ErrorCodes.NotFound, "Board not found");
  if (board._count.threads > 0) {
    throw new AppError(ErrorCodes.Conflict, "Board has threads");
  }

  return transaction(prisma, async (tx) => {
    await tx.board.delete({ where: { id: boardId } });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.board.delete",
      targetType: "board",
      targetId: boardId,
      metadata: { name: board.name },
    });

    return { ok: true as const };
  });
}
