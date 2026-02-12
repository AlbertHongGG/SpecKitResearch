import { Body, Controller, HttpException, HttpStatus, Post, Req } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'
import { UsersService } from '../users/users.service'
import { makeError } from '../common/http/error-response'
import { PasswordService } from './password.service'
import { LoginDto } from './dto/login.dto'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly users: UsersService,
    private readonly password: PasswordService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  async login(@Body() body: LoginDto, @Req() req: Request) {
    const user = await this.users.findWithPasswordByEmail(body.email)
    if (!user) {
      throw new HttpException(
        makeError('AUTH_REQUIRED', '帳號或密碼錯誤'),
        HttpStatus.UNAUTHORIZED,
      )
    }

    const ok = await this.password.verify({
      password: body.password,
      passwordHash: user.passwordHash,
    })

    if (!ok) {
      throw new HttpException(
        makeError('AUTH_REQUIRED', '帳號或密碼錯誤'),
        HttpStatus.UNAUTHORIZED,
      )
    }

    const payload = { sub: user.id, role: user.role }
    const accessToken = await this.jwt.signAsync(payload)

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    }
  }

  @Post('logout')
  async logout() {
    return { success: true }
  }
}
