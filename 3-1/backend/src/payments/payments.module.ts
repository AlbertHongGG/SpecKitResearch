import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentsController } from './payments.controller';
import { WebhookEventService } from './webhook-event.service';
import { PaymentProcessingService } from './payment-processing.service';
import { InventoryService } from './inventory.service';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [SharedModule, AuthModule],
  controllers: [PaymentsController],
  providers: [WebhookEventService, PaymentProcessingService, InventoryService, ReconciliationService],
})
export class PaymentsModule {}
