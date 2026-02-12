import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function updateBoard(
  prisma: PrismaClient,
  actor: Actor,
  boardId: string,
  input: { name?: string; description?: string | null; isActive?: boolean; sortOrder?: number },
) {
  requireAdmin(actor);

  const exists = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true } });
  if (!exists) throw new AppError(ErrorCodes.NotFound, "Board not found");

  return transaction(prisma, async (tx) => {
    const board = await tx.board.update({
      where: { id: boardId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      select: { id: true, name: true, description: true, isActive: true, sortOrder: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.board.update",
      targetType: "board",
      targetId: board.id,
      metadata: input,
    });

    return { board };
  });
}
