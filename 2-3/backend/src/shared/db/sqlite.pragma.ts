import type { PrismaClient } from '@prisma/client';

export async function applySqlitePragmas(prisma: PrismaClient): Promise<void> {
  // Many PRAGMA statements may return a result row in SQLite.
  // Prisma's $executeRawUnsafe disallows result-returning statements,
  // so we use $queryRawUnsafe and ignore the results.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys = ON;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;');
}
