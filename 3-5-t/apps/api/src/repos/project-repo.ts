import type { PrismaClient } from '@prisma/client';

export async function findProjectById(prisma: PrismaClient, projectId: string) {
  return prisma.project.findUnique({
    where: { id: projectId },
  });
}

export async function listProjectsForUser(prisma: PrismaClient, userId: string) {
  return prisma.project.findMany({
    where: {
      memberships: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      updatedAt: 'desc',
    },
  });
}
