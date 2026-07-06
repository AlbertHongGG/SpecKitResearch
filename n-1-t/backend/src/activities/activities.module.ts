import { Module } from '@nestjs/common';

import { PublicActivitiesController } from './public-activities.controller';
import { PublicActivitiesService } from './public-activities.service';

@Module({
  controllers: [PublicActivitiesController],
  providers: [PublicActivitiesService],
  exports: [PublicActivitiesService],
})
export class ActivitiesModule {}
