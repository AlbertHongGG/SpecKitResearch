import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service.js';
import { SESSION_COOKIE_NAME } from './session-cookie.js';
import type { RequestWithUser } from './session.guard.js';

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;

    if (!sessionId) return true;

    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: { user: { include: { platformRole: true } } },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      return true;
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
