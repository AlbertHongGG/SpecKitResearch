import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { SessionService } from '../../shared/auth/session.service';

import { clearSessionCookie, setSessionCookie } from './auth.cookies';
import { LoginDto, RegisterDto } from './auth.dto';
import { AuthService } from './auth.service';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly sessionService: SessionService,
  ) {}

  @Post('register')
  async register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const { sessionId, user } = await this.authService.login(body);
    setSessionCookie(reply, sessionId);
    return { user_id: user.id, role: user.role };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Res({ passthrough: true }) reply: FastifyReply, @Req() request: FastifyRequest) {
    const principal = await this.sessionService.getSessionPrincipalFromRequest(request);
    await this.authService.logout(principal?.sessionId);
    clearSessionCookie(reply);
  }
}
