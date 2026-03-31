import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../common/prisma/prisma.module';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [PrismaModule, AuditLogsModule, AuthModule],
  controllers: [AdminController, ReportsController],
  providers: [AdminService],
})
export class AdminModule {}
