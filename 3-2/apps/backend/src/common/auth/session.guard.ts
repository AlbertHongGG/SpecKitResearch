import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ErrorCodes } from '../errors/error-codes.js';
import { SESSION_COOKIE_NAME } from './session-cookie.js';

export type RequestWithUser = Request & {
  user?: { id: string; email: string; displayName: string; platformRole?: string | null };
};

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME];

    if (!sessionId) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Not logged in' });
    }

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: { include: { platformRole: true } },
      },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException({ code: ErrorCodes.UNAUTHORIZED, message: 'Session expired' });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      displayName: session.user.displayName,
      platformRole: session.user.platformRole?.role ?? null,
    };

    return true;
  }
}
