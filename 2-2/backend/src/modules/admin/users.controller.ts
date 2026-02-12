import { Body, Controller, Get, Param, Patch, BadRequestException } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../../repositories/prisma.service.js';
import { Roles } from '../auth/roles.decorator.js';

const updateSchema = z.object({
  role: z.enum(['student', 'instructor', 'admin']).optional(),
  isActive: z.boolean().optional(),
});

@Controller('admin/users')
@Roles('admin')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const items = await this.prisma.user.findMany({
      select: { id: true, email: true, role: true, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  @Patch(':userId')
  async update(@Param('userId') userId: string, @Body() body: unknown) {
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException('Invalid payload');
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: parsed.data,
    });
  }
}
