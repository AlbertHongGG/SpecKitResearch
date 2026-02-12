import { Module } from '@nestjs/common'
import { ActivitiesModule } from '../activities/activities.module'
import { MeActivitiesController } from './me-activities.controller'
import { RegistrationsController } from './registrations.controller'
import { RegistrationsService } from './registrations.service'

@Module({
  imports: [ActivitiesModule],
  controllers: [RegistrationsController, MeActivitiesController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
