import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OptionalSessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const cookieName = this.config.get<string>('SESSION_COOKIE_NAME') ?? 'sid';
    const token = req.cookies?.[cookieName];
    if (!token) return true;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await this.prisma.session.findUnique({
      where: { sessionTokenHash: tokenHash },
      include: { user: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) return true;
    if (!session.user.isActive) return true;

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
