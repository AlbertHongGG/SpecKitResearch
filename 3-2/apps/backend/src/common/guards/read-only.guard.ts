import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../errors/error-codes.js';
import { throwNotFound } from '../rbac/existence-strategy.js';

@Injectable()
export class ReadOnlyGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<any>();

    const method = String(req?.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return true;
    }

    const orgId = req?.params?.orgId as string | undefined;
    const projectId = req?.params?.projectId as string | undefined;

    if (projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: {
          id: true,
          status: true,
          organization: { select: { id: true, status: true } },
        },
      });

      if (!project) {
        throwNotFound();
      }

      if (project.organization.status === 'suspended') {
        throw new ForbiddenException({
          code: ErrorCodes.ORG_SUSPENDED,
          message: 'Organization suspended (read-only)',
        });
      }

      if (project.status === 'archived') {
        throw new ForbiddenException({
          code: ErrorCodes.PROJECT_ARCHIVED,
          message: 'Project archived (read-only)',
        });
      }

      return true;
    }

    if (orgId) {
      const org = await this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { status: true },
      });

      if (!org) {
        throwNotFound();
      }

      if (org.status === 'suspended') {
        throw new ForbiddenException({
          code: ErrorCodes.ORG_SUSPENDED,
          message: 'Organization suspended (read-only)',
        });
      }
    }

    return true;
  }
}
