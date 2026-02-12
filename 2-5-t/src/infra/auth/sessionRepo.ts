import crypto from "node:crypto";
import type { PrismaClient } from "@prisma/client";

export { SESSION_COOKIE_NAME } from "@/src/lib/http/cookieNames";

export type CreateSessionInput = {
  userId: string;
  ttlDays?: number;
  userAgent?: string;
  ipHash?: string;
  csrfSecret?: string;
};

function base64Url(bytes: Buffer) {
  return bytes
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

export function generateSessionId() {
  return base64Url(crypto.randomBytes(32));
}

export async function createSession(prisma: PrismaClient, input: CreateSessionInput) {
  const ttlDays = input.ttlDays ?? 30;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);

  return prisma.session.create({
    data: {
      id: generateSessionId(),
      userId: input.userId,
      expiresAt,
      userAgent: input.userAgent,
      ipHash: input.ipHash,
      csrfSecret: input.csrfSecret,
    },
  });
}

export async function getActiveSession(prisma: PrismaClient, sessionId: string) {
  const now = new Date();
  return prisma.session.findFirst({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    include: {
      user: true,
    },
  });
}

export async function revokeSession(prisma: PrismaClient, sessionId: string) {
  return prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllSessionsForUser(prisma: PrismaClient, userId: string) {
  return prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
