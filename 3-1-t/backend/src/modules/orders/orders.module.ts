import { Module } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrdersController],
  providers: [OrdersService, AuditService],
  exports: [OrdersService],
})
export class OrdersModule {}
