import { PrismaClient } from "@prisma/client";

type GlobalPrisma = typeof globalThis & {
  __prismaClient?: PrismaClient;
  __prismaPragmaInit?: Promise<void>;
};

const globalForPrisma = globalThis as GlobalPrisma;

export const prisma: PrismaClient =
  globalForPrisma.__prismaClient ??
  new PrismaClient({
    log: process.env.NODE_ENV === "test" ? [] : ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prismaClient = prisma;
}

async function initSqlitePragmas(client: PrismaClient) {
  // NOTE: In SQLite, PRAGMA statements can return rows; Prisma requires $queryRaw for that.
  await client.$queryRawUnsafe("PRAGMA journal_mode = WAL;");
  await client.$queryRawUnsafe("PRAGMA synchronous = NORMAL;");
  await client.$queryRawUnsafe("PRAGMA foreign_keys = ON;");
  await client.$queryRawUnsafe("PRAGMA busy_timeout = 5000;");
}

export async function ensureDbReady() {
  globalForPrisma.__prismaPragmaInit ??= initSqlitePragmas(prisma);
  await globalForPrisma.__prismaPragmaInit;
}
