import { Controller, Delete, Headers, HttpException, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { makeError } from '../common/http/error-response'
import { RegistrationsService } from './registrations.service'

@Controller('activities/:activityId/registrations')
export class RegistrationsController {
  constructor(private readonly registrations: RegistrationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async register(
    @Req() req: Request,
    @Param('activityId') activityId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = (req as any).user?.sub as string | undefined
    if (!userId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }

    return this.registrations.register({
      userId,
      activityId,
      idempotencyKey,
    })
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  async cancel(
    @Req() req: Request,
    @Param('activityId') activityId: string,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const userId = (req as any).user?.sub as string | undefined
    if (!userId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }

    return this.registrations.cancel({
      userId,
      activityId,
      idempotencyKey,
    })
  }
}
