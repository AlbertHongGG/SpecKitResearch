import type { PrismaClient } from "@prisma/client";
import { listBoards as listBoardsRepo } from "@/src/infra/repos/boardRepo";

export async function listBoards(prisma: PrismaClient) {
  const boards = await listBoardsRepo(prisma);
  return { boards };
}
