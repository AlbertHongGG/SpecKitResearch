import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AuthService } from './auth.service';
import { AuthRateLimitGuard, JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { RequestUser } from './current-user.decorator';

const RegisterSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    password_confirm: z.string().min(8),
  })
  .strict();

const LoginSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(1),
  })
  .strict();

const RefreshSchema = z
  .object({
    refresh_token: z.string().min(1),
  })
  .strict();

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @UseGuards(AuthRateLimitGuard)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterSchema))
    body: z.infer<typeof RegisterSchema>,
  ) {
    return this.auth.register({
      email: body.email,
      password: body.password,
      passwordConfirm: body.password_confirm,
    });
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginSchema)) body: z.infer<typeof LoginSchema>,
    @Req() req: Request,
  ) {
    const userAgentHeader = req.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader)
      ? userAgentHeader.join(' ')
      : userAgentHeader;

    return this.auth.login({
      email: body.email,
      password: body.password,
      userAgent,
      ip: req.ip,
    });
  }

  @UseGuards(AuthRateLimitGuard)
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body(new ZodValidationPipe(RefreshSchema))
    body: z.infer<typeof RefreshSchema>,
  ) {
    return this.auth.refresh({ refreshToken: body.refresh_token });
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(200)
  async logout(@CurrentUser() user: RequestUser) {
    return this.auth.logout(user.id);
  }
}
