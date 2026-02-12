import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { TaxonomyService } from './taxonomy.service';

@Controller('taxonomy')
export class TaxonomyController {
  constructor(private readonly service: TaxonomyService) {}

  @Get('active')
  async active() {
    const [categories, tags] = await this.service.listActive();
    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive })),
      tags: tags.map((t) => ({ id: t.id, name: t.name, isActive: t.isActive })),
    };
  }

  @Get('admin')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  async adminList() {
    const [categories, tags] = await this.service.listAll();
    return {
      categories: categories.map((c) => ({ id: c.id, name: c.name, isActive: c.isActive })),
      tags: tags.map((t) => ({ id: t.id, name: t.name, isActive: t.isActive })),
    };
  }

  @Post('category')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  async upsertCategory(@Body() body: any) {
    const c = await this.service.upsertCategory({ id: body.id, name: body.name, isActive: body.isActive });
    return { id: c.id, name: c.name, isActive: c.isActive };
  }

  @Post('tag')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  async upsertTag(@Body() body: any) {
    const t = await this.service.upsertTag({ id: body.id, name: body.name, isActive: body.isActive });
    return { id: t.id, name: t.name, isActive: t.isActive };
  }
}
