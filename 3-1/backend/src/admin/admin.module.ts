import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { SellerApplicationsController } from './seller-applications.controller';
import { SellerApplicationsService } from './seller-applications.service';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { AdminProductsController } from './products.controller';
import { SettlementsAdminController } from './settlements.controller';
import { SellerModule } from '../seller/seller.module';
import { RefundsModule } from '../refunds/refunds.module';
import { AdminRefundsController } from './admin-refunds.controller';
import { DisputesController } from './disputes.controller';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  imports: [SharedModule, AuthModule, AuditModule, SellerModule, RefundsModule],
  controllers: [
    SellerApplicationsController,
    CategoriesController,
    AdminProductsController,
    SettlementsAdminController,
    AdminRefundsController,
    DisputesController,
    AuditLogsController,
  ],
  providers: [SellerApplicationsService, CategoriesService],
})
export class AdminModule {}
