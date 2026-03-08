import { getPrisma } from '../lib/db.js';

export type SessionDurations = {
  idleSec: number;
  absoluteSec: number;
};

export async function createSession(userId: string, durations: SessionDurations) {
  const prisma = getPrisma();
  const now = new Date();
  const expiresAtIdle = new Date(now.getTime() + durations.idleSec * 1000);
  const expiresAtAbsolute = new Date(now.getTime() + durations.absoluteSec * 1000);

  return prisma.session.create({
    data: {
      userId,
      lastSeenAt: now,
      expiresAtIdle,
      expiresAtAbsolute,
    },
  });
}

export async function findSessionById(id: string) {
  const prisma = getPrisma();
  return prisma.session.findUnique({ where: { id } });
}

export function isSessionActive(session: {
  revokedAt: Date | null;
  expiresAtIdle: Date;
  expiresAtAbsolute: Date;
}): boolean {
  const now = Date.now();
  if (session.revokedAt) return false;
  if (session.expiresAtIdle.getTime() <= now) return false;
  if (session.expiresAtAbsolute.getTime() <= now) return false;
  return true;
}

export async function touchSession(id: string, durations: SessionDurations) {
  const prisma = getPrisma();
  const now = new Date();
  const nextIdle = new Date(now.getTime() + durations.idleSec * 1000);

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return null;

  const expiresAtIdle = nextIdle.getTime() < session.expiresAtAbsolute.getTime() ? nextIdle : session.expiresAtAbsolute;

  return prisma.session.update({
    where: { id },
    data: {
      lastSeenAt: now,
      expiresAtIdle,
    },
  });
}

export async function revokeSession(id: string) {
  const prisma = getPrisma();
  return prisma.session.update({
    where: { id },
    data: {
      revokedAt: new Date(),
    },
  });
}

export async function cleanupExpiredSessions() {
  const prisma = getPrisma();
  const now = new Date();
  return prisma.session.deleteMany({
    where: {
      OR: [{ expiresAtIdle: { lt: now } }, { expiresAtAbsolute: { lt: now } }],
    },
  });
}
