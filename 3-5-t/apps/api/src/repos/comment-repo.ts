import type { PrismaClient } from '@prisma/client';

export async function createComment(
  prisma: PrismaClient,
  data: {
    taskId: string;
    authorId: string;
    content: string;
  }
) {
  return prisma.comment.create({
    data: {
      taskId: data.taskId,
      authorId: data.authorId,
      content: data.content,
    },
  });
}

export async function listCommentsForTask(
  prisma: PrismaClient,
  input: {
    taskId: string;
    limit: number;
    cursor?: { createdAt: string; id: string } | null;
  }
) {
  const where: any = { taskId: input.taskId };

  if (input.cursor) {
    where.OR = [
      { createdAt: { lt: new Date(input.cursor.createdAt) } },
      { createdAt: new Date(input.cursor.createdAt), id: { lt: input.cursor.id } },
    ];
  }

  return prisma.comment.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: input.limit + 1,
  });
}
