import { Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { paymentIdParamSchema } from './payments.schemas';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':id')
  async getById(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param() rawParams: unknown,
  ) {
    const { id } = paymentIdParamSchema.parse(rawParams);
    return this.paymentsService.getPayment(user, id);
  }

  @Post(':id/retry')
  async retry(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param() rawParams: unknown,
  ) {
    const { id } = paymentIdParamSchema.parse(rawParams);
    return this.paymentsService.retryPayment(user, id);
  }
}
