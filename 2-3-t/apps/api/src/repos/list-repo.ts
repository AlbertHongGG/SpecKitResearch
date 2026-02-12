import type { PrismaClient } from '@prisma/client';

export async function getNextListOrder(prisma: PrismaClient, boardId: string): Promise<number> {
  const last = await prisma.list.findFirst({
    where: { boardId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function findBoardForListCreate(prisma: PrismaClient, projectId: string, boardId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, projectId },
  });
}

export async function createList(
  prisma: PrismaClient,
  boardId: string,
  title: string,
  data?: { isWipLimited?: boolean; wipLimit?: number | null }
) {
  const order = await getNextListOrder(prisma, boardId);
  return prisma.list.create({
    data: {
      boardId,
      title,
      order,
      status: 'active',
      isWipLimited: data?.isWipLimited ?? false,
      wipLimit: data?.wipLimit ?? null,
    },
  });
}

export async function findListInProject(prisma: PrismaClient, projectId: string, listId: string) {
  return prisma.list.findFirst({
    where: {
      id: listId,
      board: {
        projectId,
      },
    },
    include: {
      board: true,
    },
  });
}

export async function updateListOcc(
  prisma: PrismaClient,
  listId: string,
  version: number,
  data: { title?: string; isWipLimited?: boolean; wipLimit?: number | null }
) {
  const result = await prisma.list.updateMany({
    where: { id: listId, version },
    data: {
      version: { increment: 1 },
      ...data,
    },
  });
  return result.count;
}

export async function archiveListOcc(prisma: PrismaClient, listId: string, version: number) {
  const result = await prisma.list.updateMany({
    where: { id: listId, version },
    data: {
      status: 'archived',
      version: { increment: 1 },
    },
  });
  return result.count;
}

export async function listActiveListIdsForBoard(prisma: PrismaClient, boardId: string): Promise<string[]> {
  const lists = await prisma.list.findMany({
    where: { boardId, status: 'active' },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  return lists.map((l) => l.id);
}

export async function reorderLists(prisma: PrismaClient, boardId: string, orderedListIds: string[]) {
  await prisma.$transaction(
    orderedListIds.map((id, idx) =>
      prisma.list.updateMany({
        where: { id, boardId, status: 'active' },
        data: { order: idx },
      })
    )
  );
}
