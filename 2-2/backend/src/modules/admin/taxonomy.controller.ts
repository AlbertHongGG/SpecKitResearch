import { Body, Controller, Get, Param, Patch, Post, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

const categorySchema = z.object({
  name: z.string().min(1),
  isActive: z.boolean().optional(),
});

const tagSchema = categorySchema;

@Controller('admin/taxonomy')
@Roles('admin')
export class TaxonomyController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  async listCategories() {
    const items = await this.prisma.courseCategory.findMany({ orderBy: { name: 'asc' } });
    return { items };
  }

  @Post('categories')
  async createCategory(@Body() body: unknown) {
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.courseCategory.create({
      data: { name: parsed.data.name, isActive: parsed.data.isActive ?? true },
    });
  }

  @Patch('categories/:categoryId')
  async updateCategory(@Param('categoryId') categoryId: string, @Body() body: unknown) {
    const parsed = categorySchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.courseCategory.update({
      where: { id: categoryId },
      data: parsed.data,
    });
  }

  @Get('tags')
  async listTags() {
    const items = await this.prisma.tag.findMany({ orderBy: { name: 'asc' } });
    return { items };
  }

  @Post('tags')
  async createTag(@Body() body: unknown) {
    const parsed = tagSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.tag.create({
      data: { name: parsed.data.name, isActive: parsed.data.isActive ?? true },
    });
  }

  @Patch('tags/:tagId')
  async updateTag(@Param('tagId') tagId: string, @Body() body: unknown) {
    const parsed = tagSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.tag.update({
      where: { id: tagId },
      data: parsed.data,
    });
  }
}
