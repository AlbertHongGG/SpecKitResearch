import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { PrismaService } from '../db/prisma.service';
import { AppError } from '../../common/app-error';
import { getContext } from '../../common/request-context';
import { AuthGuard } from '../../guards/auth.guard';
import { SessionService } from '../auth/session.service';

const setActiveSchema = z.object({
  organizationId: z.string().min(1),
});

@Controller('orgs')
@UseGuards(AuthGuard)
export class OrgController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  @Get()
  async listOrgs(@Req() req: Request) {
    const ctx = getContext(req);
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: ctx.user!.id, status: 'ACTIVE' },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      organizations: memberships.map((m) => ({
        id: m.organizationId,
        name: m.organization.name,
        memberRole: m.role,
      })),
    };
  }

  @Put('active')
  async setActive(@Body() body: unknown, @Req() req: Request) {
    const ctx = getContext(req);
    if (!ctx.session) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Authentication required' });
    }

    const parsed = setActiveSchema.safeParse(body);
    if (!parsed.success) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: parsed.error.message });
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: parsed.data.organizationId, userId: ctx.user!.id } },
      include: { organization: true },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Not a member of this organization' });
    }

    await this.sessions.setActiveOrg(ctx.session.id, membership.organizationId);

    return {
      id: membership.organizationId,
      name: membership.organization.name,
      memberRole: membership.role,
    };
  }
}
