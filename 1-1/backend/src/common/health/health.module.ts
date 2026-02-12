import { Module } from '@nestjs/common'
import { TimeModule } from '../time/time.module'
import { HealthController } from './health.controller'

@Module({
  imports: [TimeModule],
  controllers: [HealthController],
})
export class HealthModule {}
