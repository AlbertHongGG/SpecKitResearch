import type { PrismaClient } from "@prisma/client";
import { AppError } from "@/src/lib/errors/AppError";
import { ErrorCodes } from "@/src/lib/errors/errorCodes";
import { getBoard } from "@/src/infra/repos/boardRepo";
import { listPublicThreadsByBoard } from "@/src/infra/repos/threadRepo";

export async function listThreadsByBoard(
  prisma: PrismaClient,
  boardId: string,
  page: number,
  pageSize: number,
) {
  const board = await getBoard(prisma, boardId);
  if (!board) {
    throw new AppError(ErrorCodes.NotFound, "Board not found");
  }

  const result = await listPublicThreadsByBoard(prisma, boardId, page, pageSize);
  return {
    board,
    threads: result.threads,
    pageInfo: result.pageInfo,
  };
}
