import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { OrgGuard } from '../../guards/org.guard';
import { RbacGuard } from '../../guards/rbac.guard';
import { RequireOrgRole } from '../../guards/rbac.decorator';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../db/prisma.service';

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['END_USER', 'ORG_ADMIN']),
});

const patchRoleSchema = z.object({
  role: z.enum(['END_USER', 'ORG_ADMIN']),
});

@Controller('app/org/members')
@UseGuards(AuthGuard, OrgGuard, RbacGuard)
@RequireOrgRole('ORG_ADMIN')
export class MembersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  async list(@Req() req: Request) {
    const ctx = getContext(req);

    const members = await this.prisma.organizationMember.findMany({
      where: { organizationId: ctx.org!.id },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      members: members.map((m) => ({
        id: m.id,
        email: m.user.email,
        role: m.role,
        status: m.status,
      })),
    };
  }

  @Post()
  async invite(@Req() req: Request, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = inviteSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const user = await this.prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'User not found' });
    }

    const membership = await this.prisma.organizationMember.upsert({
      where: { organizationId_userId: { organizationId: ctx.org!.id, userId: user.id } },
      create: { organizationId: ctx.org!.id, userId: user.id, role: parsed.data.role, status: 'ACTIVE' },
      update: { role: parsed.data.role, status: 'ACTIVE' },
      include: { user: true },
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: ctx.org!.id,
      action: 'org.members.invite',
      targetType: 'OrganizationMember',
      targetId: membership.id,
      payload: { email: parsed.data.email, role: parsed.data.role },
    });

    return {
      id: membership.id,
      email: membership.user.email,
      role: membership.role,
      status: membership.status,
    };
  }

  @Patch(':memberId')
  async patchRole(@Req() req: Request, @Param('memberId') memberId: string, @Body() body: unknown) {
    const ctx = getContext(req);
    const parsed = patchRoleSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const existing = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: ctx.org!.id },
      include: { user: true },
    });
    if (!existing) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Member not found' });
    }

    const updated = await this.prisma.organizationMember.update({
      where: { id: existing.id },
      data: { role: parsed.data.role },
      include: { user: true },
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: ctx.org!.id,
      action: 'org.members.role.update',
      targetType: 'OrganizationMember',
      targetId: updated.id,
      payload: { from: existing.role, to: updated.role },
    });

    return {
      id: updated.id,
      email: updated.user.email,
      role: updated.role,
      status: updated.status,
    };
  }

  @Delete(':memberId')
  @HttpCode(204)
  async remove(@Req() req: Request, @Param('memberId') memberId: string) {
    const ctx = getContext(req);

    const existing = await this.prisma.organizationMember.findFirst({
      where: { id: memberId, organizationId: ctx.org!.id },
    });
    if (!existing) {
      throw new AppError({ errorCode: 'NOT_FOUND', status: 404, message: 'Member not found' });
    }

    await this.prisma.organizationMember.update({
      where: { id: existing.id },
      data: { status: 'REMOVED' },
    });

    await this.audit.writeAuditLog({
      actorUserId: ctx.user!.id,
      actorRoleContext: 'ORG_ADMIN',
      organizationId: ctx.org!.id,
      action: 'org.members.remove',
      targetType: 'OrganizationMember',
      targetId: existing.id,
      payload: {},
    });

    return;
  }
}
