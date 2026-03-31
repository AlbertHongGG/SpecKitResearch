import { Injectable } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

export type AuditLogWriteInput = {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditLogWriteInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    return client.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId,
        ...(input.beforeData !== undefined ? { beforeData: input.beforeData } : {}),
        ...(input.afterData !== undefined ? { afterData: input.afterData } : {}),
      },
    });
  }
}
