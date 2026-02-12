import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function unbanUser(prisma: PrismaClient, actor: Actor, userId: string) {
  requireAdmin(actor);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new AppError(ErrorCodes.NotFound, "User not found");

  return transaction(prisma, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isBanned: false } });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.user.unban",
      targetType: "user",
      targetId: userId,
    });

    return { ok: true as const };
  });
}
