import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { ensureCsrfToken } from '../../common/auth/session.config';
import { AuthenticatedGuard } from '../../common/guards/authenticated.guard';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: { email?: string; password?: string }, @Req() request: Request) {
    const user = await this.authService.login(
      {
        email: body.email ?? '',
        password: body.password ?? '',
      },
      request.session,
    );

    return {
      user,
      csrfToken: ensureCsrfToken(request.session),
    };
  }

  @Post('logout')
  logout(@Req() request: Request) {
    this.authService.logout(request.session);
    return { ok: true };
  }

  @UseGuards(AuthenticatedGuard)
  @Get('me')
  getMe(@Req() request: Request) {
    return {
      user: request.session.user,
      activeOrganizationId: request.session.activeOrganizationId ?? null,
    };
  }
}
