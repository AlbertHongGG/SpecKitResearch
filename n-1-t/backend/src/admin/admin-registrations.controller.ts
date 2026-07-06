import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';

import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminActivitiesService } from './admin-activities.service';

@Controller('admin/activities/:activityId/registrations')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminRegistrationsController {
  constructor(private readonly adminActivities: AdminActivitiesService) {}

  @Get()
  list(@Param('activityId') activityId: string) {
    return this.adminActivities.listRegistrations(activityId);
  }
}
