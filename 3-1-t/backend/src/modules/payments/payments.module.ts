import { Module } from '@nestjs/common';

import { AuditService } from '../../common/audit/audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentCallbackController } from './payment-callback.controller';
import { PaymentCallbackService } from './payment-callback.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, PaymentCallbackController],
  providers: [PaymentsService, PaymentCallbackService, AuditService],
  exports: [PaymentsService, PaymentCallbackService],
})
export class PaymentsModule {}
