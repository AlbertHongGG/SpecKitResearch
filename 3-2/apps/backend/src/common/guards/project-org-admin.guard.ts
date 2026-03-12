import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../errors/error-codes.js';
import { logAuthzDenied } from '../logging/security-log.js';
import { throwNotFound } from '../rbac/existence-strategy.js';
import type { RequestWithUser } from '../auth/session.guard.js';

@Injectable()
export class ProjectOrgAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const projectId = (req as any).params?.projectId as string | undefined;
    const userId = req.user?.id;

    if (!projectId || !userId) {
      throwNotFound();
    }

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, organizationId: true },
    });

    if (!project) {
      throwNotFound();
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: project.organizationId, userId } },
      select: { orgRole: true, status: true },
    });

    if (!membership || membership.status !== 'active') {
      logAuthzDenied({
        requestId: (req as any).requestId,
        userId,
        orgId: project.organizationId,
        projectId,
        reason: 'not_member',
        route: (req as any).originalUrl,
      });
      throwNotFound();
    }

    if (membership.orgRole !== 'org_admin') {
      logAuthzDenied({
        requestId: (req as any).requestId,
        userId,
        orgId: project.organizationId,
        projectId,
        reason: 'insufficient_role',
        route: (req as any).originalUrl,
      });
      throw new ForbiddenException({
        code: ErrorCodes.FORBIDDEN,
        message: 'Org admin role required for this project',
      });
    }

    return true;
  }
}
