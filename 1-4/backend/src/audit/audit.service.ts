import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AuditAction, AuditEntityType } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(params: {
    actorId: string;
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        metadataJson: JSON.stringify(params.metadata ?? {}),
      },
    });
  }
}
