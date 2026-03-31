import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common'
import type { UserRole } from '@prisma/client'

import { ErrorCodes } from '../common/errors/error-codes'
import { sanitizeUser } from '../common/security/sanitize'
import { AuthService } from './auth.service'
import { JwtAuthGuard } from './jwt-auth.guard'
import { PasswordResetService } from './password-reset.service'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.OK)
  async register(@Body() body: any) {
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    const role = body?.role as UserRole

    if (!email || !password || (role !== 'USER' && role !== 'PROVIDER')) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const result = await this.auth.register({ email, password, role })
    return {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      user: sanitizeUser(result.user),
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() body: any) {
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    const password = typeof body?.password === 'string' ? body.password : ''

    if (!email || !password) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const result = await this.auth.login({ email, password })
    return {
      accessToken: result.accessToken,
      expiresAt: result.expiresAt,
      user: sanitizeUser(result.user),
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout() {
    return
  }

  @Post('password-reset/request')
  @HttpCode(HttpStatus.ACCEPTED)
  async requestPasswordReset(@Body() body: any) {
    const email = typeof body?.email === 'string' ? body.email.trim() : ''
    await this.passwordReset.requestPasswordReset({ email })
    return
  }

  @Post('password-reset/confirm')
  @HttpCode(HttpStatus.OK)
  async confirmPasswordReset(@Body() body: any) {
    const token = typeof body?.token === 'string' ? body.token.trim() : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''
    await this.passwordReset.confirmPasswordReset({ token, newPassword })
    return
  }
}
