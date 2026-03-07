import { Controller, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { SellerRefundsService } from './refunds.service';

@Controller('seller/refunds')
export class SellerRefundsController {
  constructor(private readonly service: SellerRefundsService) {}

  @Post(':id/approve')
  async approve(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('id') id: string,
  ) {
    return this.service.approve(user, id);
  }

  @Post(':id/reject')
  async reject(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('id') id: string,
  ) {
    return this.service.reject(user, id);
  }
}
