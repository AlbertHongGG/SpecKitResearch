import { Body, Controller, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../../../auth/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../../auth/types';
import { AdminDisputesService } from './disputes.service';

@Controller('admin/disputes')
export class AdminDisputesController {
  constructor(private readonly service: AdminDisputesService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post(':id/resolve')
  resolve(
    @Param('id') id: string,
    @Body() body: { resolution: string },
    @CurrentUser() user: CurrentUserType | undefined,
  ) {
    return this.service.resolve(id, body.resolution, user?.id);
  }
}
