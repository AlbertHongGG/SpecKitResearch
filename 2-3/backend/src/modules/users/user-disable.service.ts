import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus, UserStatus } from '@prisma/client';

import type { SessionPrincipal } from '../../shared/auth/auth.types';
import { PrismaService } from '../../shared/db/prisma.service';
import { AuditActions } from '../../shared/logging/audit-actions';
import { auditActorFromSession, writeAuditOrThrow } from '../../shared/logging/audit.decorators';
import { AuditLogService } from '../../shared/logging/audit-log.service';

@Injectable()
export class UserDisableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService,
  ) {}

  async disableUser(principal: SessionPrincipal, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
    if (!user) {
      throw new NotFoundException({ error: { code: 'not_found', message: 'User not found' } });
    }
    if (user.status === UserStatus.disabled) return;

    const actor = auditActorFromSession(principal);
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: userId }, data: { status: UserStatus.disabled } });

      await tx.userSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now }
      });

      await tx.apiKey.updateMany({
        where: { userId, status: ApiKeyStatus.active },
        data: { status: ApiKeyStatus.revoked, revokedAt: now }
      });

      await writeAuditOrThrow({
        audit: this.audit,
        tx,
        actor,
        action: AuditActions.AdminUserDisable,
        targetType: 'user',
        targetId: userId
      });
    });
  }
}
