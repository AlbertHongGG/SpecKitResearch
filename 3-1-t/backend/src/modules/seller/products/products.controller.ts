import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { SellerProductsService } from './products.service';

@Controller('seller/products')
export class SellerProductsController {
  constructor(private readonly service: SellerProductsService) {}

  @Get()
  async list(@CurrentUser() user: CurrentUserType | undefined) {
    return this.service.list(user);
  }

  @Post()
  async create(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body() body: any,
  ) {
    return this.service.create(user, body);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(user, id, body);
  }
}
