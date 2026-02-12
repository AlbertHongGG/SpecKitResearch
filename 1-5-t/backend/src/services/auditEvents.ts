import { auditLogRepository } from '../repositories/auditLogRepository.js';
import type { SessionUser } from '../auth/session.js';
import type { Prisma } from '@prisma/client';

export const auditEvents = {
  async record(
    user: SessionUser,
    params: {
      action: string;
      entityType: string;
      entityId: string;
      metadata?: any;
      tx?: Prisma.TransactionClient;
    },
  ) {
    return auditLogRepository.create(
      {
      actorId: user.id,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      },
      params.tx,
    );
  },
};
