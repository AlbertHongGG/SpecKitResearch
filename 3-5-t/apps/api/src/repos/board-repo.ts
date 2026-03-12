import type { PrismaClient } from '@prisma/client';

export async function getNextBoardOrder(prisma: PrismaClient, projectId: string): Promise<number> {
  const last = await prisma.board.findFirst({
    where: { projectId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  return (last?.order ?? -1) + 1;
}

export async function createBoard(prisma: PrismaClient, projectId: string, name: string) {
  const order = await getNextBoardOrder(prisma, projectId);
  return prisma.board.create({
    data: {
      projectId,
      name,
      order,
      status: 'active',
    },
  });
}

export async function findBoardInProject(prisma: PrismaClient, projectId: string, boardId: string) {
  return prisma.board.findFirst({
    where: { id: boardId, projectId },
  });
}

export async function updateBoardOcc(prisma: PrismaClient, projectId: string, boardId: string, version: number, data: { name?: string }) {
  const result = await prisma.board.updateMany({
    where: { id: boardId, projectId, version },
    data: {
      version: { increment: 1 },
      ...data,
    },
  });
  return result.count;
}

export async function archiveBoardOcc(prisma: PrismaClient, projectId: string, boardId: string, version: number) {
  const result = await prisma.board.updateMany({
    where: { id: boardId, projectId, version },
    data: {
      status: 'archived',
      version: { increment: 1 },
    },
  });
  return result.count;
}
