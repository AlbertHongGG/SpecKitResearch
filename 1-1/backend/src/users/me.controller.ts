import { Controller, Get, HttpException, HttpStatus, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { UsersService } from './users.service'
import { makeError } from '../common/http/error-response'

@Controller('me')
export class MeController {
  constructor(private readonly users: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async me(@Req() req: Request) {
    const userId = (req as any).user?.sub as string | undefined
    if (!userId) {
      throw new HttpException(
        makeError('AUTH_REQUIRED', '請先登入'),
        HttpStatus.UNAUTHORIZED,
      )
    }

    const user = await this.users.findById(userId)
    if (!user) {
      throw new HttpException(makeError('NOT_FOUND', 'User not found'), HttpStatus.NOT_FOUND)
    }

    return { user }
  }
}
