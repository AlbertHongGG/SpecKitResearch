import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/validation/zod-validation.pipe'
import {
  adminUsersQuerySchema,
  createAdminUserSchema,
  updateAdminUserSchema,
  userIdParamSchema,
} from './admin-users.dto'
import { AdminUsersService } from './admin-users.service'

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Get()
  @Roles('Admin')
  async list(@Query(new ZodValidationPipe(adminUsersQuerySchema)) query: any) {
    return this.adminUsers.list({ role: query.role, isActive: query.is_active })
  }

  @Post()
  @Roles('Admin')
  async create(@Body(new ZodValidationPipe(createAdminUserSchema)) body: any) {
    return this.adminUsers.create({ email: body.email, password: body.password, role: body.role })
  }

  @Patch(':userId')
  @Roles('Admin')
  async update(
    @Param(new ZodValidationPipe(userIdParamSchema)) params: any,
    @Body(new ZodValidationPipe(updateAdminUserSchema)) body: any,
  ) {
    return this.adminUsers.update({ userId: params.userId, isActive: body.is_active, role: body.role })
  }
}
