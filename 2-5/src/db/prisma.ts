import { PrismaClient } from "@prisma/client";
import { configureSqlitePragmas } from "@/db/sqlite";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var __prismaInit: Promise<void> | undefined;
}

export const prisma: PrismaClient = global.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") global.__prisma = prisma;

export async function ensureDbReady() {
  if (!global.__prismaInit) {
    global.__prismaInit = configureSqlitePragmas(prisma).catch((err) => {
      global.__prismaInit = undefined;
      throw err;
    });
  }
  await global.__prismaInit;
}
