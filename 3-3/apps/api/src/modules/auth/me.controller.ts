import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../db/prisma.service';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';

@Controller('auth')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async me(@Req() req: Request) {
    const ctx = getContext(req);
    if (!ctx.user || !ctx.session) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Authentication required' });
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    const activeOrgId = ctx.session.activeOrgId ?? memberships[0]?.organizationId ?? null;
    const active = activeOrgId
      ? memberships.find((m) => m.organizationId === activeOrgId) ?? null
      : null;

    return {
      user: ctx.user,
      organizations: memberships.map((m) => ({
        id: m.organizationId,
        name: m.organization.name,
        memberRole: m.role,
      })),
      currentOrganization: active
        ? { id: active.organizationId, name: active.organization.name, memberRole: active.role }
        : null,
    };
  }
}
