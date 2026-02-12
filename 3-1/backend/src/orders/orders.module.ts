import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { OrdersController } from './orders.controller';
import { AuditModule } from '../audit/audit.module';
import { OrdersService } from './orders.service';
import { AutoDeliveryJob } from './auto-delivery.job';

@Module({
  imports: [SharedModule, AuthModule, AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService, AutoDeliveryJob],
})
export class OrdersModule {}
