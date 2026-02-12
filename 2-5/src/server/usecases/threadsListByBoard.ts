import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";
import { ApiError } from "@/lib/errors/apiError";
import { getBoardById } from "@/server/repositories/boardRepository";

export async function threadsListByBoard(params: {
  boardId: string;
  page: number;
  pageSize: number;
}) {
  const board = await getBoardById(params.boardId);
  if (!board) throw ApiError.notFound("Board not found");

  const where: any = {
    boardId: board.id,
    status: { in: ["published", "locked"] },
  };

  type ThreadSummary = {
    id: string;
    boardId: string;
    title: string;
    status: string;
    isPinned: boolean;
    isFeatured: boolean;
    createdAt: Date;
    updatedAt: Date;
  };

  const [total, items] = await withDbRetry<[number, ThreadSummary[]]>(() =>
    prisma.$transaction([
      prisma.thread.count({ where }),
      prisma.thread.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        select: {
          id: true,
          boardId: true,
          title: true,
          status: true,
          isPinned: true,
          isFeatured: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]) as any,
  );

  return { board, total, items };
}
