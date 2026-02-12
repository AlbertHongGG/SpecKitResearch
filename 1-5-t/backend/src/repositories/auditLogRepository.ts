import { prisma } from '../db/prisma.js';
import type { Prisma } from '@prisma/client';

export const auditLogRepository = {
  create(
    params: { actorId: string; action: string; entityType: string; entityId: string; metadata: any },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? prisma;
    return client.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadataJson: JSON.stringify(params.metadata ?? {}),
      },
    });
  },
  listByEntity(entityType: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'asc' },
    });
  },
};
