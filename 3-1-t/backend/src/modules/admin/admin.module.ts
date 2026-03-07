import { Module } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAnalyticsController } from './analytics/analytics.controller';
import { AdminAnalyticsService } from './analytics/analytics.service';
import { AdminCategoriesController } from './categories/categories.controller';
import { AdminCategoriesService } from './categories/categories.service';
import { AdminDisputesController } from './disputes/disputes.controller';
import { AdminDisputesService } from './disputes/disputes.service';
import { AdminOrdersController } from './orders/orders.controller';
import { AdminOrdersService } from './orders/orders.service';
import { AdminRefundsController } from './refunds/refunds.controller';
import { AdminRefundsService } from './refunds/refunds.service';
import { AdminSellerApplicationsController } from './seller-applications/seller-applications.controller';
import { AdminSellerApplicationsService } from './seller-applications/seller-applications.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AdminSellerApplicationsController,
    AdminCategoriesController,
    AdminOrdersController,
    AdminRefundsController,
    AdminDisputesController,
    AdminAnalyticsController,
  ],
  providers: [
    AuditService,
    AdminSellerApplicationsService,
    AdminCategoriesService,
    AdminOrdersService,
    AdminRefundsService,
    AdminDisputesService,
    AdminAnalyticsService,
  ],
})
export class AdminModule {}
