import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../shared/http/zod-validation.pipe';
import { LoginRequestSchema } from '@app/contracts';
import { AuthService } from './auth.service';
import { loadEnv } from '../shared/config/env';

@Controller()
export class AuthController {
  private readonly env = loadEnv();

  constructor(private readonly auth: AuthService) {}

  @Post('/login')
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: any,
    @Res({ passthrough: true }) res: Response
  ) {
    const { user, sid, csrfToken } = await this.auth.login(body.username, body.password);

    res.cookie(this.env.SESSION_COOKIE_NAME, sid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.env.COOKIE_SECURE,
      path: '/',
      maxAge: this.env.SESSION_TTL_SECONDS * 1000
    });

    return { user, return_to: body.return_to, csrf_token: csrfToken };
  }

  @Post('/logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const sid = (req.cookies?.[this.env.SESSION_COOKIE_NAME] ?? null) as string | null;
    if (sid) {
      await this.auth.logout(sid);
    }
    res.clearCookie(this.env.SESSION_COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Get('/session')
  async session(@Req() req: Request) {
    const sid = (req.cookies?.[this.env.SESSION_COOKIE_NAME] ?? null) as string | null;
    const s = await this.auth.getSession(sid);
    return { user: s.user, csrf_token: s.csrfToken ?? undefined };
  }
}
