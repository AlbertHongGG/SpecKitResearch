import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import {
  paymentCallbackSchema,
  type PaymentCallbackBody,
} from './payments.schemas';
import { PaymentCallbackService } from './payment-callback.service';

@Controller('payments/callback')
export class PaymentCallbackController {
  constructor(private readonly callbackService: PaymentCallbackService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(paymentCallbackSchema))
  async callback(@Body() body: PaymentCallbackBody) {
    return this.callbackService.handleCallback(body);
  }
}
