import { Controller, Get, HttpException, HttpStatus, Param, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { makeError } from '../common/http/error-response'
import { AdminActivitiesService } from './admin-activities.service'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/activities/:activityId/registrations')
export class AdminRegistrationsController {
  constructor(private readonly adminActivities: AdminActivitiesService) {}

  @Get()
  async getRoster(@Req() req: Request, @Param('activityId') activityId: string) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }
    return this.adminActivities.getRoster({ actorUserId, activityId })
  }
}
