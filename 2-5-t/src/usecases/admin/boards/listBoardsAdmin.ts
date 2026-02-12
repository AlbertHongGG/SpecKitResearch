import type { PrismaClient } from "@prisma/client";

import type { Actor } from "@/src/domain/policies/rbac";
import { requireAdmin } from "@/src/domain/policies/adminOnly";

export async function listBoardsAdmin(prisma: PrismaClient, actor: Actor) {
  requireAdmin(actor);

  const boards = await prisma.board.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, description: true, isActive: true, sortOrder: true },
  });

  return { boards };
}
