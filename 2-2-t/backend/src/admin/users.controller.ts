import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { SessionGuard } from '../common/auth/session.guard';
import { RolesGuard } from '../common/auth/roles.guard';
import { Roles } from '../common/auth/roles.decorator';
import { AdminUsersService } from './users.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

const SetActiveSchema = z.object({ isActive: z.boolean() });
const SetRoleSchema = z.object({ role: z.enum(['student', 'instructor', 'admin']) });

@Controller('admin/users')
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Get()
  async list() {
    return this.service.list();
  }

  @Patch(':userId/active')
  async setActive(@Param('userId') userId: string, @Body(new ZodValidationPipe(SetActiveSchema)) body: any) {
    const u = await this.service.setActive({ userId, isActive: body.isActive });
    return { id: u.id, isActive: u.isActive };
  }

  @Patch(':userId/role')
  async setRole(@Param('userId') userId: string, @Body(new ZodValidationPipe(SetRoleSchema)) body: any) {
    const u = await this.service.setRole({ userId, role: body.role });
    return { id: u.id, role: u.role };
  }
}
