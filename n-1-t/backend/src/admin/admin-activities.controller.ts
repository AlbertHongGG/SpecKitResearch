import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminChangeStatusDto } from './dto/admin-change-status.dto';
import { AdminUpsertActivityDto } from './dto/admin-upsert-activity.dto';
import { AdminActivitiesService } from './admin-activities.service';

@Controller('admin/activities')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminActivitiesController {
  constructor(private readonly adminActivities: AdminActivitiesService) {}

  @Get()
  listAll() {
    return this.adminActivities.listAll();
  }

  @Post()
  create(@Req() req: any, @Body() body: AdminUpsertActivityDto) {
    const user = req.user as AuthUser;
    return this.adminActivities.createDraft({ actorUserId: user.id, body });
  }

  @Put(':activityId')
  update(@Req() req: any, @Param('activityId') activityId: string, @Body() body: AdminUpsertActivityDto) {
    const user = req.user as AuthUser;
    return this.adminActivities.update({ actorUserId: user.id, activityId, body });
  }

  @Post(':activityId/status')
  changeStatus(
    @Req() req: any,
    @Param('activityId') activityId: string,
    @Body() body: AdminChangeStatusDto,
  ) {
    const user = req.user as AuthUser;
    return this.adminActivities.changeStatus({ actorUserId: user.id, activityId, toStatus: body.toStatus });
  }
}
