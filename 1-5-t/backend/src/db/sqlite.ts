import { prisma } from './prisma.js';

export async function configureSqlitePragmas() {
  // WAL improves read/write concurrency; busy_timeout reduces transient lock failures.
  // NOTE: In SQLite, PRAGMA statements can return rows, so we must use $queryRaw.
  await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
  await prisma.$queryRawUnsafe('PRAGMA busy_timeout=5000;');
  await prisma.$queryRawUnsafe('PRAGMA foreign_keys=ON;');
}
