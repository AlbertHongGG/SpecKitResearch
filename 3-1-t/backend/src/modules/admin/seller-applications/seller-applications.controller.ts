import { Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { AdminSellerApplicationsService } from './seller-applications.service';

@Controller('admin/seller-applications')
export class AdminSellerApplicationsController {
  constructor(private readonly service: AdminSellerApplicationsService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType | undefined,
  ) {
    return this.service.approve(id, user?.id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserType | undefined,
  ) {
    return this.service.reject(id, user?.id);
  }
}
