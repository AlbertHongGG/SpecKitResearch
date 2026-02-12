import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth.guard';
import type { AuthUser } from '../auth/types';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ZodValidationPipe } from '../shared/validation/zod-validation.pipe';
import { CategoriesService } from './categories.service';

type AuthedRequest = Request & { user?: AuthUser };

const createSchema = z.object({ name: z.string().min(1) });
const patchSchema = z.object({ status: z.enum(['active', 'inactive']) });

@Controller('admin/categories')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  async list() {
    const items = await this.categories.list();
    return { items };
  }

  @Post()
  async create(@Req() req: AuthedRequest, @Body(new ZodValidationPipe(createSchema)) body: z.infer<typeof createSchema>) {
    const category = await this.categories.create({ adminUserId: req.user!.id, name: body.name });
    return { category };
  }

  @Patch(':categoryId')
  async setStatus(
    @Req() req: AuthedRequest,
    @Param('categoryId') categoryId: string,
    @Body(new ZodValidationPipe(patchSchema)) body: z.infer<typeof patchSchema>,
  ) {
    const category = await this.categories.setStatus({
      adminUserId: req.user!.id,
      categoryId,
      status: body.status,
    });
    return { category };
  }
}
