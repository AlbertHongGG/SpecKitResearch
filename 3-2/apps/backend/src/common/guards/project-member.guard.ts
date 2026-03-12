import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import type { RequestWithUser } from '../auth/session.guard.js';
import { throwNotFound } from '../rbac/existence-strategy.js';

@Injectable()
export class ProjectMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
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

    (req as any).projectMembership = membership;
    return true;
  }
}
