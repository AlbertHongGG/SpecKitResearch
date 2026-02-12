import { Module } from '@nestjs/common'
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard'
import { ActivitiesController } from './activities.controller'
import { ActivitiesService } from './activities.service'
import { ViewerStateService } from './viewer-state.service'

@Module({
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ViewerStateService, OptionalJwtAuthGuard],
  exports: [ActivitiesService, ViewerStateService],
})
export class ActivitiesModule {}
