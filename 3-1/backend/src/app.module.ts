import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { AuditModule } from './audit/audit.module';
import { DebugController } from './shared/http/debug.controller';
import { CatalogModule } from './catalog/catalog.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SellerModule } from './seller/seller.module';
import { AdminModule } from './admin/admin.module';
import { RefundsModule } from './refunds/refunds.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    SharedModule,
    AuthModule,
    AuditModule,
    CatalogModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    RefundsModule,
    ReviewsModule,
    SellerModule,
    AdminModule,
  ],
  controllers: [AppController, DebugController],
  providers: [AppService],
})
export class AppModule {}
