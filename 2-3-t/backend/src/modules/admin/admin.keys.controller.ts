import { Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';

import { PrismaService } from '../../common/db/prisma.service';
import { CurrentAuth, RbacGuard, RequireRole, RequireSession } from '../../common/security/rbac.guard';
import { AuditWriter } from '../logs/audit.writer';
import { enqueueAuditOrFailClosed } from '../logs/audit.policy';
import { makeActorFromAuth, makeAuditEvent } from '../logs/audit.emit';

@Controller('/admin/keys')
@UseGuards(RbacGuard)
@RequireSession()
@RequireRole('ADMIN')
export class AdminKeysController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriter,
  ) {}

  @Post('/:id/block')
  @HttpCode(200)
  async block(@CurrentAuth() auth: any, @Param('id') id: string) {
    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        action: 'admin.key.block',
        targetType: 'api_key',
        targetId: id,
        success: true,
      }),
    );
    await this.prisma.apiKey.update({ where: { id }, data: { status: 'BLOCKED', blockedAt: new Date() } });
    return { ok: true };
  }

  @Post('/:id/revoke')
  @HttpCode(200)
  async revoke(@CurrentAuth() auth: any, @Param('id') id: string) {
    enqueueAuditOrFailClosed(
      this.audit,
      makeAuditEvent({
        ...makeActorFromAuth(auth),
        action: 'admin.key.revoke',
        targetType: 'api_key',
        targetId: id,
        success: true,
      }),
    );
    await this.prisma.apiKey.update({ where: { id }, data: { status: 'REVOKED', revokedAt: new Date() } });
    return { ok: true };
  }
}
