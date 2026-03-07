import { Body, Controller, Post, UsePipes } from '@nestjs/common';

import { CurrentUser } from '../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../auth/types';
import { ZodValidationPipe } from '../../common/validation/zod.pipe';
import { refundRequestSchema, type RefundRequestBody } from './refunds.schemas';
import { RefundsService } from './refunds.service';

@Controller('refund-requests')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @UsePipes(new ZodValidationPipe(refundRequestSchema))
  async create(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: RefundRequestBody,
  ) {
    return this.refundsService.createRefundRequest(user, body);
  }
}
