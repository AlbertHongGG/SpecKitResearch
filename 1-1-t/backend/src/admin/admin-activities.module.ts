import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AdminActivitiesController } from './admin-activities.controller';
import { AdminActivitiesService } from './admin-activities.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminActivitiesController],
  providers: [AdminActivitiesService],
})
export class AdminActivitiesModule {}
