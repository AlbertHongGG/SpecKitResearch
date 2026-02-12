import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SellerApplicationController } from './seller-application.controller';
import { SellerProductsController } from './seller-products.controller';
import { SellerSubOrdersController } from './seller-suborders.controller';
import { SettlementsController } from './settlements.controller';
import { SellerRefundsController } from './seller-refunds.controller';
import { RefundsModule } from '../refunds/refunds.module';
import { SellerProductsService } from './seller-products.service';
import { FulfillmentService } from './fulfillment.service';
import { SettlementService } from './settlement.service';
import { SettlementJob } from './settlement.job';

@Module({
  imports: [SharedModule, AuthModule, AuditModule, RefundsModule],
  controllers: [
    SellerApplicationController,
    SellerProductsController,
    SellerSubOrdersController,
    SettlementsController,
    SellerRefundsController,
  ],
  providers: [SellerProductsService, FulfillmentService, SettlementService, SettlementJob],
  exports: [SellerProductsService],
})
export class SellerModule {}
