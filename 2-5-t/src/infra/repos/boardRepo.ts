import type { PrismaClient } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";

export async function listBoards(prisma: PrismaClient) {
  await ensureDbReady();
  return prisma.board.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      sortOrder: true,
    },
  });
}

export async function getBoard(prisma: PrismaClient, boardId: string) {
  await ensureDbReady();
  return prisma.board.findUnique({
    where: { id: boardId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      sortOrder: true,
    },
  });
}
