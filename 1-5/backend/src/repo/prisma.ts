import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export async function initSqlitePragmas(): Promise<void> {
  // Best-effort pragmas for better concurrency under SQLite.
  // NOTE: In SQLite, some PRAGMA statements return rows; Prisma requires $queryRaw* for those.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
}
