import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function createBoard(
  prisma: PrismaClient,
  actor: Actor,
  input: { name: string; description?: string | null; isActive?: boolean; sortOrder?: number },
) {
  requireAdmin(actor);

  return transaction(prisma, async (tx) => {
    const max = await tx.board.aggregate({ _max: { sortOrder: true } });
    const sortOrder = input.sortOrder ?? ((max._max.sortOrder ?? 0) + 1);

    const board = await tx.board.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        isActive: input.isActive ?? true,
        sortOrder,
      },
      select: { id: true, name: true, description: true, isActive: true, sortOrder: true },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.board.create",
      targetType: "board",
      targetId: board.id,
      metadata: { name: board.name, isActive: board.isActive, sortOrder: board.sortOrder },
    });

    return { board };
  });
}
