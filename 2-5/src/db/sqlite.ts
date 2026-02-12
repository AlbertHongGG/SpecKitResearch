import type { PrismaClient } from "@prisma/client";

export async function configureSqlitePragmas(prisma: PrismaClient) {
  // PRAGMA statements are SQLite-specific; safe to ignore failures on other providers.
  // In SQLite, PRAGMA often returns rows, so use $queryRawUnsafe (executeRaw forbids result sets).
  await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
  await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000;");
  await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
}
