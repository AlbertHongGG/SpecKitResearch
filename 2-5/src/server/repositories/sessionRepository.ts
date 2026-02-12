import { prisma } from "@/db/prisma";
import { withDbRetry } from "@/db/withRetry";

export function createSessionRow(data: {
  id: string;
  userId: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}) {
  return withDbRetry(() =>
    prisma.session.create({
      data: {
        id: data.id,
        userId: data.userId,
        expiresAt: data.expiresAt,
        ip: data.ip,
        userAgent: data.userAgent,
      },
    }),
  );
}

export function deleteSessionRow(id: string) {
  return withDbRetry(() => prisma.session.delete({ where: { id } })).catch(() => null);
}
