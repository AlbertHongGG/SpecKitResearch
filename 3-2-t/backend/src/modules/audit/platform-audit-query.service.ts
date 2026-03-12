import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class PlatformAuditQueryService {
  constructor(@Inject(AuditLogService) private readonly auditLogService: AuditLogService) {}

  async listAudit(
    query: { action?: string; organizationId?: string; projectId?: string; limit?: number },
    actor: { platformRoles: string[] },
  ) {
    if (!actor.platformRoles.includes('platform_admin')) {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Platform admin role is required.',
      });
    }

    const entries = await this.auditLogService.listRecent({
      organizationId: query.organizationId,
      projectId: query.projectId,
      action: query.action,
      limit: query.limit ?? 100,
    });

    return entries.map((entry) => ({
      auditLogId: entry.id,
      createdAt: entry.createdAt.toISOString(),
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorUserId: entry.actorUserId,
      actorEmail: entry.actorEmail,
      organizationId: entry.organizationId,
      projectId: entry.projectId,
      beforeJson: entry.beforeJson,
      afterJson: entry.afterJson,
    }));
  }
}
