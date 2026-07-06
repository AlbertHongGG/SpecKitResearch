import { Controller, Get, Param } from '@nestjs/common';

import { PublicActivitiesService } from './public-activities.service';

@Controller()
export class PublicActivitiesController {
  constructor(private readonly publicActivities: PublicActivitiesService) {}

  @Get('activities')
  list() {
    return this.publicActivities.listPublic();
  }

  @Get('activities/:activityId')
  detail(@Param('activityId') activityId: string) {
    return this.publicActivities.getPublicDetail(activityId);
  }
}
