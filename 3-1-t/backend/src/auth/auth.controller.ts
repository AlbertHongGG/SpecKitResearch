import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UsePipes,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { CurrentUser } from './current-user.decorator';
import type { CurrentUser as CurrentUserType } from './types';
import { ZodValidationPipe } from '../common/validation/zod.pipe';
import { AuthService } from './auth.service';
import {
  loginBodySchema,
  signupBodySchema,
  type LoginBody,
  type SignupBody,
} from './auth.schemas';
import { SessionService } from './session/session.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('signup')
  @UsePipes(new ZodValidationPipe(signupBodySchema))
  async signup(
    @Body() body: SignupBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.signup(body);
    const session = await this.sessionService.create(user.id);
    this.setSessionCookie(response, session.token, session.expiresAt);

    return { user };
  }

  @Post('login')
  @UsePipes(new ZodValidationPipe(loginBodySchema))
  async login(
    @Body() body: LoginBody,
    @Res({ passthrough: true }) response: Response,
  ) {
    const user = await this.authService.login(body);
    const session = await this.sessionService.create(user.id);
    this.setSessionCookie(response, session.token, session.expiresAt);

    return { user };
  }

  @Post('logout')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookieName = this.sessionService.getCookieName();
    const token = request.cookies?.[cookieName] as string | undefined;

    if (token) {
      await this.sessionService.destroy(token);
    }

    response.clearCookie(cookieName, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });

    return { ok: true };
  }

  @Get('session')
  async currentSession(@CurrentUser() user: CurrentUserType | undefined) {
    return { user: user ?? null };
  }

  private setSessionCookie(response: Response, token: string, expiresAt: Date) {
    response.cookie(this.sessionService.getCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      path: '/',
    });
  }
}
