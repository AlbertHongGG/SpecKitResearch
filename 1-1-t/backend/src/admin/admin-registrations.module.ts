import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../common/prisma/prisma.module';
import { AdminRegistrationsController } from './admin-registrations.controller';
import { AdminRegistrationsService } from './admin-registrations.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AdminRegistrationsController],
  providers: [AdminRegistrationsService],
})
export class AdminRegistrationsModule {}
