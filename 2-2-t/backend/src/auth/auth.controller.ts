import {
  Body,
  Controller,
  ConflictException,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import {
  AuthSessionResponseSchema,
  ErrorCodes,
  LoginRequestSchema,
  RegisterRequestSchema,
  makeError,
} from '@app/contracts';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SessionGuard } from '../common/auth/session.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly sessionService: SessionService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @UsePipes(new ZodValidationPipe(RegisterRequestSchema))
  async register(@Body() body: any) {
    const emailLower = String(body.email).trim().toLowerCase();

    try {
      await this.prisma.user.create({
        data: {
          email: body.email,
          emailLower,
          passwordHash: this.passwordService.hash(body.password),
          role: 'student',
          isActive: true,
        },
      });
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? '');
      if (msg.includes('Unique constraint') || msg.includes('UNIQUE') || e?.code === 'P2002') {
        throw new ConflictException(makeError(ErrorCodes.CONFLICT, 'Email 已被使用'));
      }
      throw e;
    }
  }

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginRequestSchema))
  async login(@Body() body: any, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const emailLower = String(body.email).trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { emailLower } });

    if (!user || !this.passwordService.verify(body.password, user.passwordHash)) {
      throw new UnauthorizedException(makeError(ErrorCodes.INVALID_CREDENTIALS, '帳號或密碼錯誤'));
    }
    if (!user.isActive) {
      throw new ForbiddenException(makeError(ErrorCodes.USER_DISABLED, '帳號已停用'));
    }

    const { token, session } = await this.sessionService.createSession({
      userId: user.id,
      ip: req.ip,
      userAgent: req.header('user-agent') ?? undefined,
    });

    const cookieName = this.sessionService.getCookieName();
    const secure = Boolean(this.config.get('SESSION_COOKIE_SECURE') ?? false);
    res.cookie(cookieName, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
    });

    const payload = AuthSessionResponseSchema.parse({
      user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive },
      session: { expiresAt: session.expiresAt.toISOString(), createdAt: session.createdAt.toISOString() },
    });
    return payload;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookieName = this.sessionService.getCookieName();
    const token = (req as any).cookies?.[cookieName];
    if (!token) {
      throw new UnauthorizedException(makeError(ErrorCodes.UNAUTHORIZED, '未登入'));
    }

    await this.sessionService.revokeSessionByToken(token, 'logout');

    res.clearCookie(cookieName, { path: '/' });
    return;
  }

  @Get('session')
  @UseGuards(SessionGuard)
  async session(@Req() req: any) {
    return AuthSessionResponseSchema.parse({
      user: req.user,
      session: {
        expiresAt: req.session.expiresAt.toISOString(),
      },
    });
  }
}
