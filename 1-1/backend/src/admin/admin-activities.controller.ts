import { Body, Controller, Get, HttpException, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { makeError } from '../common/http/error-response'
import { AdminActivitiesService } from './admin-activities.service'
import { ActivityUpsertRequestDto } from './dto/admin-activity.dto'

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('admin/activities')
export class AdminActivitiesController {
  constructor(private readonly adminActivities: AdminActivitiesService) {}

  @Get()
  async list(@Req() req: Request) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }
    return this.adminActivities.listAll({ actorUserId })
  }

  @Get(':activityId')
  async getOne(@Req() req: Request, @Param('activityId') activityId: string) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }
    return this.adminActivities.getOne({ actorUserId, activityId })
  }

  @Post()
  async create(@Req() req: Request, @Body() body: ActivityUpsertRequestDto) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }
    return this.adminActivities.create({ actorUserId, body })
  }

  @Patch(':activityId')
  async update(
    @Req() req: Request,
    @Param('activityId') activityId: string,
    @Body() body: ActivityUpsertRequestDto,
  ) {
    const actorUserId = (req as any).user?.sub as string | undefined
    if (!actorUserId) {
      throw new HttpException(makeError('AUTH_REQUIRED', '請先登入'), HttpStatus.UNAUTHORIZED)
    }
    return this.adminActivities.update({ actorUserId, activityId, body })
  }
}
