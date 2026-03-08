import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { AuditWriter } from '../logs/audit.writer';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';

@Controller('/admin/users')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Post('/:id/disable')
  @HttpCode(200)
  async disable(@CurrentAuth() auth: any, @Param('id') id: string) {
    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        action: 'admin.user.disable',
        targetType: 'user',
        targetId: id,
        success: true,
      }),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { status: 'DISABLED' } });
      await tx.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await tx.apiKey.updateMany({ where: { userId: id, status: 'ACTIVE' }, data: { status: 'REVOKED', revokedAt: new Date() } });
    });

    return { ok: true };
  }
}
