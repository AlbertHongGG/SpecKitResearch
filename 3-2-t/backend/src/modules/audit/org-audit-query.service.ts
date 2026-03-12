import { ForbiddenException, Inject, Injectable } from '@nestjs/common';

import { ERROR_CODES } from '../../common/errors/error-codes';
import { resourceHidden } from '../../common/errors/resource-visibility.policy';
import { AuthRepository } from '../auth/auth.repository';
import { AuditLogService } from './audit-log.service';

@Injectable()
export class OrgAuditQueryService {
  constructor(
    @Inject(AuditLogService) private readonly auditLogService: AuditLogService,
    @Inject(AuthRepository) private readonly authRepository: AuthRepository,
  ) {}

  async listAudit(
    orgId: string,
    query: { action?: string; projectId?: string; limit?: number },
    actor: { userId: string; platformRoles: string[] },
  ) {
    const membership = await this.authRepository.findOrganizationAccess(actor.userId, orgId);
    const isPlatformAdmin = actor.platformRoles.includes('platform_admin');

    if (!membership && !isPlatformAdmin) {
      throw resourceHidden('Organization');
    }
    if (!isPlatformAdmin && membership?.orgRole !== 'org_admin') {
      throw new ForbiddenException({
        code: ERROR_CODES.ROLE_REQUIRED,
        message: 'Organization admin role is required.',
      });
    }

    const entries = await this.auditLogService.listRecent({
      organizationId: orgId,
      projectId: query.projectId,
      action: query.action,
      limit: query.limit ?? 50,
    });

    return entries.map((entry) => this.serialize(entry));
  }

  private serialize(entry: {
    id: string;
    createdAt: Date;
    action: string;
    entityType: string;
    entityId: string;
    actorUserId: string | null;
    actorEmail: string;
    organizationId: string | null;
    projectId: string | null;
    beforeJson: string | null;
    afterJson: string | null;
  }) {
    return {
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
    };
  }
}
