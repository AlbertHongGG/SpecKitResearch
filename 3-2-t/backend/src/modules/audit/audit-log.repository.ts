import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../../common/prisma/prisma.service';

export interface AuditWriteInput {
  action: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  actorEmail?: string;
  organizationId?: string;
  projectId?: string;
  beforeJson?: string;
  afterJson?: string;
}

export interface AuditQueryInput {
  organizationId?: string;
  projectId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}

@Injectable()
export class AuditLogRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  create(entry: AuditWriteInput) {
    return this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorUserId: entry.actorUserId,
        actorEmail: entry.actorEmail ?? 'system',
        organizationId: entry.organizationId,
        projectId: entry.projectId,
        beforeJson: entry.beforeJson,
        afterJson: entry.afterJson,
      },
    });
  }

  findRecent(query: AuditQueryInput) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId: query.organizationId,
        projectId: query.projectId,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: query.limit ?? 50,
    });
  }
}
