import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PrismaService } from '../db/prisma.service';
import { getConfig } from '../config/config';

export type AuthUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'DEVELOPER';
  status: 'ACTIVE' | 'DISABLED';
};

export type AuthContext = {
  user: AuthUser;
  sessionId: string;
};

declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
  }
}

const META_REQUIRE_SESSION = 'rbac:requireSession';
const META_REQUIRE_ROLE = 'rbac:requireRole';

export const RequireSession = () => SetMetadata(META_REQUIRE_SESSION, true);
export const RequireRole = (role: AuthUser['role']) => SetMetadata(META_REQUIRE_ROLE, role);

export const CurrentAuth = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<any>();
  return req.auth as AuthContext | undefined;
});

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireSession = this.reflector.getAllAndOverride<boolean>(META_REQUIRE_SESSION, [
      context.getHandler(),
      context.getClass(),
    ]);
    const requireRole = this.reflector.getAllAndOverride<AuthUser['role'] | undefined>(
      META_REQUIRE_ROLE,
      [context.getHandler(), context.getClass()],
    );

    if (!requireSession && !requireRole) return true;

    const req = context.switchToHttp().getRequest<any>();
    const config = getConfig(process.env);
    const sid = req.cookies?.[config.sessionCookieName];
    if (!sid) throw new UnauthorizedException('No session');

    const session = await this.prisma.session.findUnique({
      where: { id: sid },
      include: { user: true },
    });
    if (!session || session.revokedAt) throw new UnauthorizedException('Invalid session');
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) throw new UnauthorizedException('Expired session');
    if (session.user.status !== 'ACTIVE') throw new UnauthorizedException('User disabled');

    req.auth = {
      sessionId: session.id,
      user: {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role as any,
        status: session.user.status as any,
      },
    };

    if (requireRole && session.user.role !== requireRole) throw new ForbiddenException('Forbidden');
    return true;
  }
}
