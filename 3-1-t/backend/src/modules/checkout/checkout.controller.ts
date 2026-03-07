import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import { checkoutBodySchema, type CheckoutBody } from './checkout.schemas';
import { CheckoutService } from './checkout.service';

@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(checkoutBodySchema))
  async checkout(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() _body: CheckoutBody,
  ) {
    return this.checkoutService.createCheckout(user);
  }
}
