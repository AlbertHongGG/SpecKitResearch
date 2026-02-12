import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../shared/db/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditActions } from '../audit/audit.actions';

type AuthedRequest = Request & { user?: AuthUser };

@Controller('admin/settlements')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class SettlementsAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Query('status') status?: string) {
    const items = await this.prisma.settlement.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { items };
  }

  @Post(':settlementId/mark-settled')
  async markSettled(@Req() req: AuthedRequest, @Param('settlementId') settlementId: string) {
    const settlement = await this.prisma.settlement.update({
      where: { id: settlementId },
      data: { status: 'settled' },
    });

    await this.audit.write({
      actorUserId: req.user!.id,
      actorRole: 'admin',
      action: AuditActions.SETTLEMENT_MARK_SETTLED,
      targetType: 'Settlement',
      targetId: settlementId,
    });

    return { settlement };
  }
}
