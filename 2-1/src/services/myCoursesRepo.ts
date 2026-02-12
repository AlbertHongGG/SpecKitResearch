import { prisma } from '@/db/prisma';

export async function listMyCourses(userId: string) {
  return prisma.purchase.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      course: { include: { instructor: true } },
    },
  });
}
