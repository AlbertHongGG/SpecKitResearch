import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { IdempotencyModule } from '../idempotency/idempotency.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminActivitiesController } from './admin-activities.controller';
import { AdminActivitiesService } from './admin-activities.service';
import { AdminExportController } from './admin-export.controller';
import { AdminRegistrationsController } from './admin-registrations.controller';

@Module({
  imports: [PrismaModule, AuditModule, IdempotencyModule, AuthModule],
  controllers: [AdminActivitiesController, AdminRegistrationsController, AdminExportController],
  providers: [AdminActivitiesService],
})
export class AdminModule {}
