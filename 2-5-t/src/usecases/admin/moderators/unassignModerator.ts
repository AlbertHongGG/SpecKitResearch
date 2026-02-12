import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { transaction } from "@/src/infra/db/transaction";
import { writeAuditInTx } from "@/src/usecases/audit/writeAudit";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function unassignModerator(
  prisma: PrismaClient,
  actor: Actor,
  input: { boardId: string; userEmail: string },
) {
  requireAdmin(actor);

  const email = normalizeEmail(input.userEmail);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new AppError(ErrorCodes.NotFound, "User not found");

  const assignment = await prisma.moderatorAssignment.findUnique({
    where: { boardId_userId: { boardId: input.boardId, userId: user.id } },
    select: { id: true, boardId: true, userId: true },
  });
  if (!assignment) throw new AppError(ErrorCodes.NotFound, "Assignment not found");

  return transaction(prisma, async (tx) => {
    await tx.moderatorAssignment.delete({ where: { id: assignment.id } });

    await writeAuditInTx(tx, {
      actorId: actor.user.id,
      action: "admin.moderator.unassign",
      targetType: "moderatorAssignment",
      targetId: assignment.id,
      metadata: { boardId: assignment.boardId, userId: assignment.userId },
    });

    return { ok: true as const };
  });
}
