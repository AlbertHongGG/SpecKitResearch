import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppError } from '../common/app-error';
import { getContext, setContext } from '../common/request-context';
import { PrismaService } from '../modules/db/prisma.service';

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const ctx = getContext(req);

    if (!ctx.user) {
      throw new AppError({ errorCode: 'AUTH_REQUIRED', status: 401, message: 'Authentication required' });
    }

    const orgId = req.header('x-organization-id');
    if (!orgId) {
      throw new AppError({ errorCode: 'VALIDATION_ERROR', status: 400, message: 'Missing X-Organization-Id' });
    }

    const membership = await this.prisma.organizationMember.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: ctx.user.id } },
    });

    if (!membership || membership.status !== 'ACTIVE') {
      throw new AppError({ errorCode: 'FORBIDDEN', status: 403, message: 'Not a member of this organization' });
    }

    setContext(req, {
      ...ctx,
      org: { id: orgId, role: membership.role },
    });

    return true;
  }
}
