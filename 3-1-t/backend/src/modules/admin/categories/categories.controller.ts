import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { AdminCategoriesService } from './categories.service';

@Controller('admin/categories')
export class AdminCategoriesController {
  constructor(private readonly service: AdminCategoriesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(
    @Body() body: { name: string },
    @CurrentUser() user: CurrentUserType | undefined,
  ) {
    return this.service.create(body, user?.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name?: string; status?: 'ACTIVE' | 'INACTIVE' },
    @CurrentUser() user: CurrentUserType | undefined,
  ) {
    return this.service.update(id, body, user?.id);
  }
}
