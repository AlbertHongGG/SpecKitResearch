import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";

export async function listModerators(prisma: PrismaClient, actor: Actor, input: { boardId: string }) {
  requireAdmin(actor);

  const assignments = await prisma.moderatorAssignment.findMany({
    where: { boardId: input.boardId },
    orderBy: { createdAt: "asc" },
    select: { id: true, boardId: true, user: { select: { id: true, email: true, role: true, isBanned: true } } },
  });

  return {
    assignments: assignments.map((a) => ({
      id: a.id,
      boardId: a.boardId,
      user: a.user,
    })),
  };
}
