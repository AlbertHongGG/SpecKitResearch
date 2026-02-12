import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import type { AuditAction } from './audit-actions';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(params: {
    actorId?: string;
    actorRole: string;
    action: AuditAction;
    targetType: string;
    targetId: string;
    metadata?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        metadata: JSON.stringify(params.metadata ?? null),
      },
    });
  }
}
