import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { ErrorCodes, makeError } from '@app/contracts';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    const token = req.cookies?.[cookieName];
    if (!token) {
      throw new UnauthorizedException(makeError(ErrorCodes.UNAUTHORIZED, '未登入'));
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new UnauthorizedException(makeError(ErrorCodes.UNAUTHORIZED, 'Session 已失效，請重新登入'));
    }

    if (!session.user.isActive) {
      throw new ForbiddenException(makeError(ErrorCodes.USER_DISABLED, '帳號已停用'));
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      isActive: session.user.isActive,
    };
    req.session = { id: session.id, expiresAt: session.expiresAt };

    return true;
  }
}
