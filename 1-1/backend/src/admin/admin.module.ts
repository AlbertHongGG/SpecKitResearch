import { Module } from '@nestjs/common'
import { ActivitiesModule } from '../activities/activities.module'
import { AdminActivitiesController } from './admin-activities.controller'
import { AdminActivitiesStatusController } from './admin-activities-status.controller'
import { AdminActivitiesService } from './admin-activities.service'
import { AdminExportController } from './admin-export.controller'
import { AdminRegistrationsController } from './admin-registrations.controller'

@Module({
  imports: [ActivitiesModule],
  controllers: [
    AdminActivitiesController,
    AdminActivitiesStatusController,
    AdminRegistrationsController,
    AdminExportController,
  ],
  providers: [AdminActivitiesService],
})
export class AdminModule {}
