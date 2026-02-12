import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import type { RequestUser } from '../../common/guards/jwt-auth.guard'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import { AuthService } from './auth.service'
import { loginSchema, registerSchema } from './auth.dto'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(200)
  async register(@Body(new ZodValidationPipe(registerSchema)) body: any) {
    const { email, password } = body as {
      email: string
      password: string
      password_confirm: string
    }
    return this.auth.register({ email, password })
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body(new ZodValidationPipe(loginSchema)) body: any) {
    const { email, password } = body as { email: string; password: string }
    return this.auth.login({ email, password })
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout() {
    return this.auth.logout()
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user?: RequestUser) {
    return user
  }
}
