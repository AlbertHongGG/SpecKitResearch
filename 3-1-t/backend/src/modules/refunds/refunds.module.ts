import { Module } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule],
  controllers: [RefundsController],
  providers: [RefundsService, AuditService],
  exports: [RefundsService],
})
export class RefundsModule {}
