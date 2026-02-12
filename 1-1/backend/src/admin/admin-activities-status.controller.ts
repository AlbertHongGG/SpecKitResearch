import { Body, Controller, Headers, HttpException, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { makeError } from '../common/http/error-response'
import { AdminActivitiesService } from './admin-activities.service'
import { ActivityStatusChangeRequestDto } from './dto/admin-activity.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/activities/:activityId/status')
export class AdminActivitiesStatusController {
  constructor(private readonly adminActivities: AdminActivitiesService) {}

  @Post()
  async changeStatus(
    @Req() req: Request,
    @Param('activityId') activityId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: ActivityStatusChangeRequestDto,
  ) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }

    return this.adminActivities.changeStatus({ actorUserId, activityId, idempotencyKey, body })
  }
}
