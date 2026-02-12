import {
  Body,
  Controller,
  Post,
  Res,
  Req,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { z } from 'zod';
import type { Request, Response } from 'express';
import { PrismaService } from '../../repositories/prisma.service.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import { SessionService } from './session.service.js';
import { Public } from './public.decorator.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = registerSchema;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await hashPassword(parsed.data.password);
    await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        role: 'student',
        isActive: true,
      },
    });
    return { message: 'Registered. Please login.' };
  }

  @Public()
  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    const email = parsed.data.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new ForbiddenException('Account disabled');
    }
    const ok = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const ttl = Number(process.env.SESSION_TTL_SECONDS ?? '604800');
    const session = await this.sessions.createSession(user.id, ttl);
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'session_id';
    res.cookie(cookieName, session.id, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
    });
    return { id: user.id, email: user.email, role: user.role };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = process.env.SESSION_COOKIE_NAME ?? 'session_id';
    const sessionId = req.cookies?.[cookieName];
    if (sessionId) {
      await this.sessions.revokeSession(sessionId);
    }
    res.clearCookie(cookieName, { path: '/' });
    return { message: 'Logged out' };
  }
}
