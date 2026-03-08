import { Injectable } from '@nestjs/common';

import type { AuditActorRole, Prisma } from '@prisma/client';

import { PrismaService } from '../db/prisma.service';

export type AuditLogWriteInput = {
  actorUserId?: string;
  actorRole: AuditActorRole;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: AuditLogWriteInput, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        actorUserId: input.actorUserId ?? null,
        actorRole: input.actorRole,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        metadataJson: input.metadata ? JSON.stringify(input.metadata) : null
      }
    });
  }
}
