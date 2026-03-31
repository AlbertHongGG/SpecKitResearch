import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { z } from 'zod';

import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UserRole } from '../generated/prisma/client';

import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ActiveUserGuard } from './guards/active-user.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import type { CurrentUser as CurrentUserType } from './auth.types';
import { PasswordResetService } from './password-reset.service';

const RegisterBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum([UserRole.USER, UserRole.PROVIDER]),
  })
  .strict();

const LoginBodySchema = z
  .object({
    email: z.string().email(),
    password: z.string(),
  })
  .strict();

const ForgotPasswordBodySchema = z
  .object({
    email: z.string().email(),
  })
  .strict();

const ResetPasswordBodySchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8),
  })
  .strict();

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordResetService: PasswordResetService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  async register(
    @Body(new ZodValidationPipe(RegisterBodySchema))
    body: z.infer<typeof RegisterBodySchema>,
  ) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(LoginBodySchema))
    body: z.infer<typeof LoginBodySchema>,
  ) {
    return this.authService.login(body);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  async me(@CurrentUser() user: CurrentUserType | undefined) {
    const userId = user?.id;
    if (!userId) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Unauthorized.',
      });
    }

    const record = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!record) {
      throw new UnauthorizedException({
        code: ErrorCodes.UNAUTHORIZED,
        message: 'Unauthorized.',
      });
    }

    return record;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, ActiveUserGuard)
  @HttpCode(204)
  logout() {
    return;
  }

  @Post('password/forgot')
  @HttpCode(202)
  async forgotPassword(
    @Body(new ZodValidationPipe(ForgotPasswordBodySchema))
    body: z.infer<typeof ForgotPasswordBodySchema>,
  ) {
    await this.passwordResetService.createResetTokenForEmail(body.email);
    return { ok: true };
  }

  @Post('password/reset')
  @HttpCode(204)
  async resetPassword(
    @Body(new ZodValidationPipe(ResetPasswordBodySchema))
    body: z.infer<typeof ResetPasswordBodySchema>,
  ) {
    const newPasswordHash = await this.authService.hashPassword(body.newPassword);
    await this.passwordResetService.resetPassword({
      token: body.token,
      newPasswordHash,
    });
    return;
  }
}
