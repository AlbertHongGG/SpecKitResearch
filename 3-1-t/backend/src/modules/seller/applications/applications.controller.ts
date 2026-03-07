import { Body, Controller, Get, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { SellerApplicationsService } from './applications.service';

@Controller('seller/applications')
export class SellerApplicationsController {
  constructor(private readonly service: SellerApplicationsService) {}

  @Post('submit')
  async submit(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: { shopName?: string },
  ) {
    return this.service.submit(user, body?.shopName);
  }

  @Get('status')
  async status(@CurrentUser() user: CurrentUserType | undefined) {
    return this.service.status(user);
  }
}
