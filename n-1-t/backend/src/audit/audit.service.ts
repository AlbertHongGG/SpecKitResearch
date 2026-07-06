import { Injectable } from '@nestjs/common';
import type { AuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(params: {
    actorUserId: string | null;
    action: AuditAction;
    targetType: string;
    targetId: string;
    summary: string;
  }, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;

    await client.auditLog.create({
      data: {
        actorUserId: params.actorUserId,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        summary: params.summary,
      },
    });
  }
}
