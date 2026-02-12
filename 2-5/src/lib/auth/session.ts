import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";

export type Viewer = {
  user: {
    id: string;
    email: string;
    role: string;
    isBanned: boolean;
  };
  sessionId: string;
  moderatorBoards: string[];
};

export async function getSession(sessionId: string) {
  return withDbRetry(() =>
    prisma.session.findUnique({
      where: { id: sessionId },
    }),
  );
}

export async function createSession(userId: string, sessionId: string, expiresAt: Date, meta?: { ip?: string; userAgent?: string }) {
  return withDbRetry(() =>
    prisma.session.create({
      data: {
        id: sessionId,
        userId,
        expiresAt,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    }),
  );
}

export async function invalidateSession(sessionId: string) {
  return withDbRetry(() =>
    prisma.session.delete({
      where: { id: sessionId },
    }),
  ).catch(() => null);
}

export async function touchSession(sessionId: string, meta?: { ip?: string; userAgent?: string }) {
  return withDbRetry(() =>
    prisma.session.update({
      where: { id: sessionId },
      data: {
        lastSeenAt: new Date(),
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      },
    }),
  ).catch(() => null);
}

export async function getViewerBySessionId(sessionId: string): Promise<Viewer | null> {
  const session = await getSession(sessionId);
  if (!session) return null;
  if (session.expiresAt.getTime() <= Date.now()) {
    await invalidateSession(sessionId);
    return null;
  }

  const user = await withDbRetry(() => prisma.user.findUnique({ where: { id: session.userId } }));
  if (!user) {
    await invalidateSession(sessionId);
    return null;
  }

  const assignments = await withDbRetry(() =>
    prisma.moderatorAssignment.findMany({
      where: { userId: user.id },
      select: { boardId: true },
    }),
  );

  return {
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      isBanned: user.isBanned,
    },
    sessionId,
    moderatorBoards: assignments.map((a) => a.boardId),
  };
}
