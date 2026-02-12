import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LoginRequestSchema } from '@acme/contracts';
import { ZodValidationPipe } from '../common/zodValidation.pipe';
import { AuthService } from './auth.service';
import { CsrfService } from './csrf.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly csrf: CsrfService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('login')
  async login(
    @Body(new ZodValidationPipe(LoginRequestSchema)) body: { email: string; password: string; return_to?: string },
    @Req() req: Request,
  ) {
    const user = await this.auth.login(body.email, body.password);
    req.session.userId = user.id;
    this.csrf.getOrCreateToken(req);
    return { user, return_to: body.return_to };
  }

  @Post('logout')
  async logout(@Req() req: Request) {
    await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
    return { ok: true };
  }

  @Get('session')
  async session(@Req() req: Request) {
    const userId = req.session.userId;
    if (!userId) {
      const csrfToken = this.csrf.getOrCreateToken(req);
      return { authenticated: false, user: null, csrf_token: csrfToken };
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
      const csrfToken = this.csrf.getOrCreateToken(req);
      return { authenticated: false, user: null, csrf_token: csrfToken };
    }

    const csrfToken = this.csrf.getOrCreateToken(req);
    return { authenticated: true, user: { id: userId, email: user.email }, csrf_token: csrfToken };
  }
}
