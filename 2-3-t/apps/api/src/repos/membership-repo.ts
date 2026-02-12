import type { PrismaClient } from '@prisma/client';

export async function findMembership(prisma: PrismaClient, projectId: string, userId: string) {
  return prisma.projectMembership.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });
}

export async function listProjectMemberships(prisma: PrismaClient, projectId: string) {
  return prisma.projectMembership.findMany({
    where: { projectId },
  });
}
