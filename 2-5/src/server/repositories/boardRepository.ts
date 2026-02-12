import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import type { Board } from "@prisma/client";

export async function listBoards(): Promise<Board[]> {
  return withDbRetry(() =>
    prisma.board.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  );
}

export async function getBoardById(boardId: string): Promise<Board | null> {
  return withDbRetry(() => prisma.board.findUnique({ where: { id: boardId } }));
}
