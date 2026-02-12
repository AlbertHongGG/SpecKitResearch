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

export async function assignModerator(
  prisma: PrismaClient,
  actor: Actor,
  input: { boardId: string; userEmail: string },
) {
  requireAdmin(actor);

  const board = await prisma.board.findUnique({ where: { id: input.boardId }, select: { id: true } });
  if (!board) throw new AppError(ErrorCodes.NotFound, "Board not found");

  const email = normalizeEmail(input.userEmail);
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) throw new AppError(ErrorCodes.NotFound, "User not found");

  return transaction(prisma, async (tx) => {
    try {
      const assignment = await tx.moderatorAssignment.create({
        data: { boardId: input.boardId, userId: user.id },
        select: { id: true, boardId: true, userId: true },
      });

      await writeAuditInTx(tx, {
        actorId: actor.user.id,
        action: "admin.moderator.assign",
        targetType: "moderatorAssignment",
        targetId: assignment.id,
        metadata: { boardId: assignment.boardId, userId: assignment.userId },
      });

      return { assignment };
    } catch (err: any) {
      if (err?.code === "P2002") {
        throw new AppError(ErrorCodes.Conflict, "Duplicate assignment");
      }
      throw err;
    }
  });
}
