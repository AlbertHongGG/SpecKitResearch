import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { OrgMemberGuard } from '../../common/guards/org-member.guard.js';
import { OrgRoleGuard } from '../../common/guards/org-role.guard.js';
import { ReadOnlyGuard } from '../../common/guards/read-only.guard.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';
import type { RequestWithUser } from '../../common/auth/session.guard.js';
import { throwNotFound } from '../../common/rbac/existence-strategy.js';
import { AuditService } from '../audit/audit.service.js';
import { auditOrgMemberRemoved, auditOrgMemberRoleUpdated } from './org-members.audit.js';

@Controller('orgs/:orgId/members')
export class OrgMembersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @UseGuards(SessionGuard, OrgMemberGuard, OrgRoleGuard)
  async list(@Param('orgId') orgId: string) {
    const rows = await this.prisma.organizationMembership.findMany({
      where: { organizationId: orgId, status: 'active' },
      include: { user: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      members: rows.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        displayName: m.user.displayName,
        orgRole: m.orgRole,
      })),
    };
  }

  @Patch(':userId')
  @UseGuards(SessionGuard, OrgMemberGuard, OrgRoleGuard, ReadOnlyGuard)
  async updateRole(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(z.object({ orgRole: z.enum(['org_admin', 'org_member']) })))
    body: { orgRole: 'org_admin' | 'org_member' },
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      select: { userId: true, orgRole: true, status: true },
    });

    if (!existing || existing.status !== 'active') {
      throwNotFound();
    }

    const before = { ...existing };

    const updated = await this.prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { orgRole: body.orgRole },
      select: { userId: true, orgRole: true, status: true },
    });

    const after = { ...updated };

    await auditOrgMemberRoleUpdated({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId },
      member: { userId: updated.userId, orgRole: updated.orgRole },
      before,
      after,
    });

    return { ok: true };
  }

  @Delete(':userId')
  @UseGuards(SessionGuard, OrgMemberGuard, OrgRoleGuard, ReadOnlyGuard)
  async remove(
    @Param('orgId') orgId: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: RequestWithUser['user'],
  ) {
    const existing = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      select: { userId: true, orgRole: true, status: true },
    });

    if (!existing || existing.status !== 'active') {
      throwNotFound();
    }

    const before = { ...existing };

    await this.prisma.organizationMembership.update({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      data: { status: 'removed' },
    });

    await auditOrgMemberRemoved({
      audit: this.audit,
      actor: { userId: actor!.id, email: actor!.email },
      scope: { orgId },
      member: { userId },
      before,
    });

    return { ok: true };
  }
}
