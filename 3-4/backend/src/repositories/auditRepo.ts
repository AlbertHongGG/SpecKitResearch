import { getPrisma } from '../lib/db.js';
import { Prisma } from '@prisma/client';

export async function createAuditLog(input: {
  actorUserId: string | null;
  actorRole: 'USER' | 'ADMIN' | null;
  action: string;
  targetType: string;
  targetId: string | null;
  requestId: string | null;
  meta: unknown | null;
}) {
  const prisma = getPrisma();
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      requestId: input.requestId,
      meta: input.meta === null ? Prisma.JsonNull : (input.meta as Prisma.InputJsonValue),
      createdAt: new Date(),
    },
  });
}
