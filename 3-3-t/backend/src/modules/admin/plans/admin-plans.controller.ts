import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { AdminPlansService } from './admin-plans.service';

@Controller('admin/plans')
export class AdminPlansController {
  constructor(private readonly service: AdminPlansService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Post()
  create(@Body() body: any) {
    return this.service.create(body);
  }

  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.toggle(id, body.isActive);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: {
      priceCents?: number;
      limits?: Record<string, unknown>;
      features?: Record<string, boolean>;
    },
  ) {
    return this.service.update(id, body);
  }
}
