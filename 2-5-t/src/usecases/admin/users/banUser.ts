import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

export async function banUser(prisma: PrismaClient, actor: Actor, userId: string, input?: { reason?: string }) {
  requireAdmin(actor);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isBanned: true } });
  if (!user) throw new AppError(ErrorCodes.NotFound, "User not found");

  if (user.isBanned) {
    return { ok: true as const };
  }

  return transaction(prisma, async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { isBanned: true } });

    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.user.ban",
      targetType: "user",
      targetId: userId,
      metadata: { reason: input?.reason },
    });

    return { ok: true as const };
  });
}
