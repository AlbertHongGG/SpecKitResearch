import { Controller, Get, HttpException, HttpStatus, Param, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import type { ActivityStatus } from '@prisma/client'
import { makeError } from '../common/http/error-response'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { ActivitiesService } from './activities.service'

@Controller('activities')
@UseGuards(OptionalJwtAuthGuard)
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  async list(@Req() req: Request, @Query('status') status?: ActivityStatus) {
    const viewerUserId = (req as any).user?.sub as string | undefined

    const items = await this.activities.listPublic({
      status,
      viewerUserId,
    })

    return { items }
  }

  @Get(':activityId')
  async detail(@Req() req: Request, @Param('activityId') activityId: string) {
    const viewerUserId = (req as any).user?.sub as string | undefined

    const activity = await this.activities.getPublicDetail({
      activityId,
      viewerUserId,
    })

    if (!activity) {
      throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
    }

    return { activity }
  }
}
