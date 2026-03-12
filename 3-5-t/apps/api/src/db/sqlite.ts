import type { PrismaClient } from '@prisma/client';

export async function initSqlite(prisma: PrismaClient) {
  // Best-effort pragmas for better concurrency and durability.
  // Note: journal_mode=WAL returns a row; use queryRaw.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
  await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
}
