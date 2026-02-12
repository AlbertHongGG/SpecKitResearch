import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { PrismaService } from '../../prisma/prisma.service.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';
import { verifyPassword } from '../../common/auth/password.js';
import {
  clearSessionCookie,
  SESSION_COOKIE_NAME,
  setSessionCookie,
} from '../../common/auth/session-cookie.js';
import { ErrorCodes } from '../../common/errors/error-codes.js';
import { SessionService } from './session.service.js';
import { SessionGuard } from '../../common/auth/session.guard.js';
import { CurrentUser } from '../../common/auth/current-user.decorator.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {}

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    }

    const ok = await verifyPassword(user.passwordHash, body.password);
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Invalid credentials',
      });
    }

    const session = await this.sessions.createSession(user.id);
    setSessionCookie(res, session.id, { secure: false });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      user: { id: user.id, email: user.email, displayName: user.displayName },
    };
  }

  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const sessionId = (req as any).cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (sessionId) {
      await this.sessions.deleteSession(sessionId);
    }
    clearSessionCookie(res);
    return { ok: true };
  }

  @Get('me')
  @UseGuards(SessionGuard)
  me(@CurrentUser() user: any) {
    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  }
}
