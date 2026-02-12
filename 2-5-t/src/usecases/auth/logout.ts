import type { PrismaClient } from "@prisma/client";
import { ensureDbReady } from "@/src/infra/db/prisma";
import { revokeSession } from "@/src/infra/auth/sessionRepo";

export async function logout(prisma: PrismaClient, sessionId: string) {
  await ensureDbReady();
  await revokeSession(prisma, sessionId);
}
