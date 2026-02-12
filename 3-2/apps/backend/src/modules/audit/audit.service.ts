import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuditAction } from './audit.actions.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async append(entry: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    actorUserId?: string | null;
    actorEmail: string;
    organizationId?: string | null;
    projectId?: string | null;
    beforeJson?: unknown;
    afterJson?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        actorUserId: entry.actorUserId ?? null,
        actorEmail: entry.actorEmail,
        organizationId: entry.organizationId ?? null,
        projectId: entry.projectId ?? null,
        beforeJson: entry.beforeJson ? JSON.stringify(entry.beforeJson) : null,
        afterJson: entry.afterJson ? JSON.stringify(entry.afterJson) : null,
      },
    });
  }
}
