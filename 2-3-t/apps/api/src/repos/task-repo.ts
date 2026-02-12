import type { Prisma, PrismaClient, TaskStatus } from '@prisma/client';

export async function findTaskInProject(
  prisma: PrismaClient,
  projectId: string,
  taskId: string
) {
  return prisma.task.findFirst({
    where: { id: taskId, projectId },
    include: {
      board: true,
      list: {
        include: {
          board: true,
        },
      },
      assignees: true,
    },
  });
}

export async function findTaskPositionInList(
  prisma: PrismaClient,
  projectId: string,
  listId: string,
  taskId: string
): Promise<{ id: string; position: string } | null> {
  return prisma.task.findFirst({
    where: { id: taskId, projectId, listId },
    select: { id: true, position: true },
  });
}

export async function findLastTaskPosition(prisma: PrismaClient, listId: string): Promise<string | null> {
  const last = await prisma.task.findFirst({
    where: { listId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });
  return last?.position ?? null;
}

export async function countActiveTasksInList(prisma: PrismaClient, listId: string): Promise<number> {
  return prisma.task.count({
    where: {
      listId,
      status: { not: 'archived' },
    },
  });
}

export async function createTask(
  prisma: PrismaClient | Prisma.TransactionClient,
  data: {
    projectId: string;
    boardId: string;
    listId: string;
    title: string;
    description: string | null;
    dueDate: Date | null;
    priority: number | null;
    position: string;
    status?: TaskStatus;
    createdByUserId: string;
  }
) {
  return prisma.task.create({
    data: {
      projectId: data.projectId,
      boardId: data.boardId,
      listId: data.listId,
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      priority: data.priority,
      position: data.position,
      status: data.status ?? 'open',
      createdByUserId: data.createdByUserId,
    },
  });
}

export async function updateTaskOcc(
  prisma: PrismaClient | Prisma.TransactionClient,
  projectId: string,
  taskId: string,
  version: number,
  data: {
    title?: string;
    description?: string | null;
    dueDate?: Date | null;
    priority?: number | null;
    status?: TaskStatus;
  }
): Promise<number> {
  const result = await (prisma as any).task.updateMany({
    where: { id: taskId, projectId, version },
    data: {
      version: { increment: 1 },
      ...data,
    },
  });
  return result.count;
}

export async function moveTaskOcc(
  prisma: PrismaClient | Prisma.TransactionClient,
  projectId: string,
  taskId: string,
  expectedVersion: number,
  data: {
    boardId: string;
    listId: string;
    position: string;
  }
): Promise<number> {
  const result = await (prisma as any).task.updateMany({
    where: { id: taskId, projectId, version: expectedVersion },
    data: {
      boardId: data.boardId,
      listId: data.listId,
      position: data.position,
      version: { increment: 1 },
    },
  });
  return result.count;
}

export async function archiveTaskOcc(
  prisma: PrismaClient | Prisma.TransactionClient,
  projectId: string,
  taskId: string,
  version: number
): Promise<number> {
  const result = await (prisma as any).task.updateMany({
    where: { id: taskId, projectId, version },
    data: {
      status: 'archived',
      version: { increment: 1 },
    },
  });
  return result.count;
}
