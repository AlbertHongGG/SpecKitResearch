import { Controller, Get, HttpException, HttpStatus, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { makeError } from '../common/http/error-response'
import { RegistrationsService } from './registrations.service'

@Controller('me/activities')
export class MeActivitiesController {
  constructor(private readonly registrations: RegistrationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getMyActivities(@Req() req: Request) {
    const userId = (req as any).user?.sub as string | undefined
    if (!userId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }

    return this.registrations.listMyActivities({ userId })
  }
}
