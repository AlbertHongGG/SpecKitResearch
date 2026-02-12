import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { RequestWithUser } from '../auth/session.guard.js';
import { throwNotFound } from '../rbac/existence-strategy.js';

@Injectable()
export class OrgMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const orgId = (req as any).params?.orgId as string | undefined;
    const userId = req.user?.id;

    if (!orgId || !userId) {
      throwNotFound();
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId } },
    });

    if (!membership || membership.status !== 'active') {
      throwNotFound();
    }

    (req as any).orgMembership = membership;
    return true;
  }
}
