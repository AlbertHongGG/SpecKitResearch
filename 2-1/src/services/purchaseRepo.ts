import { Prisma } from '@prisma/client';

import { prisma } from '@/db/prisma';
import { AppError } from '@/lib/errors/AppError';

export async function isPurchased(userId: string, courseId: string) {
  const existing = await prisma.purchase.findUnique({
    where: { userId_courseId: { userId, courseId } },
    select: { id: true },
  });
  return !!existing;
}

export async function purchaseCourse(userId: string, courseId: string) {
  try {
    return await prisma.purchase.create({
      data: { userId, courseId },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw AppError.conflict('已購買');
    }
    throw e;
  }
}
