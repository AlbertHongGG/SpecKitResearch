import type { Prisma, PrismaClient } from '@prisma/client';

export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: 5_000,
    timeout: 10_000,
  });
}
