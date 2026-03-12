import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { RequestWithUser } from '../auth/session.guard.js';
import { throwForbidden, throwNotFound } from '../rbac/existence-strategy.js';
import type { ProjectRole } from '../rbac/roles.js';

export const PROJECT_ROLES_KEY = 'projectRoles';
export const RequireProjectRoles = (...roles: ProjectRole[]) =>
  SetMetadata(PROJECT_ROLES_KEY, roles);

@Injectable()
export class ProjectRoleGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const handler = context.getHandler();

    const requiredRoles =
      this.reflector.get<ProjectRole[]>(PROJECT_ROLES_KEY, handler) ?? [];

    const projectId = (req as any).params?.projectId as string | undefined;
    const userId = req.user?.id;

    if (!projectId || !userId) {
      throwNotFound();
    }

    const membership = await this.prisma.projectMembership.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!membership) {
      throwNotFound();
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(membership.projectRole as ProjectRole)) {
      throwForbidden('Project role required');
    }

    (req as any).projectMembership = membership;
    return true;
  }
}
