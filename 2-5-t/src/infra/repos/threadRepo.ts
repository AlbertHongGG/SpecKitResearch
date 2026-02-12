import type { PrismaClient, ThreadStatus } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";

export type Pagination = { page: number; pageSize: number };

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function normalizePagination(page: number, pageSize: number): Pagination {
  return {
    page: clamp(page, 1, 10_000),
    pageSize: clamp(pageSize, 1, 50),
  };
}

export async function listPublicThreadsByBoard(
  prisma: PrismaClient,
  boardId: string,
  page: number,
  pageSize: number,
) {
  await ensureDbReady();

  const visibleStatuses: ThreadStatus[] = ["published", "locked"];

  const p = normalizePagination(page, pageSize);
  const where = {
    boardId,
    status: { in: visibleStatuses },
  };

  const [total, threads] = await prisma.$transaction([
    prisma.thread.count({ where }),
    prisma.thread.findMany({
      where,
      orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
      skip: (p.page - 1) * p.pageSize,
      take: p.pageSize,
      select: {
        id: true,
        title: true,
        status: true,
        isPinned: true,
        isFeatured: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    threads,
    pageInfo: { page: p.page, pageSize: p.pageSize, total },
  };
}

export async function getThreadForPublic(prisma: PrismaClient, threadId: string) {
  await ensureDbReady();

  const visibleStatuses: ThreadStatus[] = ["published", "locked"];

  return prisma.thread.findFirst({
    where: {
      id: threadId,
      status: { in: visibleStatuses },
    },
    select: {
      id: true,
      boardId: true,
      authorId: true,
      title: true,
      content: true,
      status: true,
      isPinned: true,
      isFeatured: true,
      createdAt: true,
    },
  });
}
