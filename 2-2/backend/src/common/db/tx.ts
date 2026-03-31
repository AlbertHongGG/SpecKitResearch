export type TxContext = {
  requestId?: string
  actorUserId?: string
}

import { Prisma, PrismaClient } from '@prisma/client'

export async function withTx<T>(
  prisma: PrismaClient,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx) => fn(tx))
}
