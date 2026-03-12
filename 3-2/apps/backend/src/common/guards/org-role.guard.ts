import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { RequestWithUser } from '../auth/session.guard.js';
import { logAuthzDenied } from '../logging/security-log.js';
import { throwForbidden, throwNotFound } from '../rbac/existence-strategy.js';

@Injectable()
export class OrgRoleGuard implements CanActivate {
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
      logAuthzDenied({
        requestId: (req as any).requestId,
        userId,
        orgId,
        reason: 'not_member',
        route: (req as any).originalUrl,
      });
      throwNotFound();
    }

    if (membership.orgRole !== 'org_admin') {
      logAuthzDenied({
        requestId: (req as any).requestId,
        userId,
        orgId,
        reason: 'insufficient_role',
        route: (req as any).originalUrl,
      });
      throwForbidden('Org admin role required');
    }

    return true;
  }
}
