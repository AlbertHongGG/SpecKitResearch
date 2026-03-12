import {
  BadRequestException,
  ConflictException,
  Controller,
  HttpCode,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { PrismaService } from '../../common/db/prisma.service';
import { ZodValidationPipe } from '../../common/http/zod-validation.pipe';
import { PasswordService } from './password.service';
import { normalizeEmail } from './email';
import { getConfig } from '../../common/config/config';
import { CurrentAuth, RbacGuard, RequireSession } from '../../common/security/rbac.guard';
import { SessionDal } from './session.dal';

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller()
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly sessions: SessionDal,
  ) {}

  @Post('/register')
  async register(@Req() req: FastifyRequest) {
    const body = new ZodValidationPipe(RegisterSchema).transform((req as any).body);
    const email = normalizeEmail(body.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await this.passwords.hashPassword(body.password);
    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: 'DEVELOPER', status: 'ACTIVE' },
    });
    return { user_id: user.id };
  }

  @Post('/login')
  @HttpCode(200)
  async login(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const body = new ZodValidationPipe(LoginSchema).transform((req as any).body);
    const email = normalizeEmail(body.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Invalid credentials');
    await this.passwords.verifyPassword(user.passwordHash, body.password);

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const session = await this.sessions.createSession(user.id);

    const config = getConfig(process.env);
    reply.setCookie(config.sessionCookieName, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: config.nodeEnv === 'production',
      path: '/',
      expires: session.expiresAt,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role === 'ADMIN' ? 'admin' : 'developer',
        status: user.status === 'ACTIVE' ? 'active' : 'disabled',
      },
    };
  }

  @Post('/logout')
  @HttpCode(204)
  @UseGuards(RbacGuard)
  @RequireSession()
  async logout(
    @CurrentAuth() auth: any,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const config = getConfig(process.env);
    await this.sessions.revokeSession(auth.sessionId);
    reply.clearCookie(config.sessionCookieName, { path: '/' });
    return;
  }
}
