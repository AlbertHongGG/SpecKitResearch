import type { Prisma, PrismaClient } from "@prisma/client";

export async function transaction<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => fn(tx));
}
