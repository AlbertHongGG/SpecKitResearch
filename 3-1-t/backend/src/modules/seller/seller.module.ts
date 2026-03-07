import { Module } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { SellerApplicationsController } from './applications/applications.controller';
import { SellerApplicationsService } from './applications/applications.service';
import { SellerOrdersController } from './orders/orders.controller';
import { SellerOrdersService } from './orders/orders.service';
import { SellerProductsController } from './products/products.controller';
import { SellerProductsService } from './products/products.service';
import { SellerRefundsController } from './refunds/refunds.controller';
import { SellerRefundsService } from './refunds/refunds.service';
import { SellerSettlementsController } from './settlements/settlements.controller';
import { SellerSettlementsService } from './settlements/settlements.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    SellerApplicationsController,
    SellerProductsController,
    SellerOrdersController,
    SellerRefundsController,
    SellerSettlementsController,
  ],
  providers: [
    AuditService,
    SellerApplicationsService,
    SellerProductsService,
    SellerOrdersService,
    SellerRefundsService,
    SellerSettlementsService,
  ],
})
export class SellerModule {}
