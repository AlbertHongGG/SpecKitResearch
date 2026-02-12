import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { RequestUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import { AppError } from '../common/errors/app-error';
import { ErrorCodes } from '../common/errors/error-codes';
import { AdminUsersService } from './admin-users.service';

const ApiRoleSchema = z.enum(['Customer', 'Agent', 'Admin']);

const CreateUserSchema = z
  .object({
    email: z.string().email(),
    role: ApiRoleSchema,
    is_active: z.boolean().optional(),
  })
  .strict();

const UpdateUserSchema = z
  .object({
    role: ApiRoleSchema.optional(),
    is_active: z.boolean().optional(),
  })
  .strict();

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsers: AdminUsersService) {}

  @Post()
  async createUser(
    @CurrentUser() actor: RequestUser,
    @Body(new ZodValidationPipe(CreateUserSchema))
    body: z.infer<typeof CreateUserSchema>,
  ) {
    return this.adminUsers.createUser({
      actorId: actor.id,
      email: body.email,
      role: body.role,
      isActive: body.is_active,
    });
  }

  @Patch(':userId')
  async updateUser(
    @CurrentUser() actor: RequestUser,
    @Param('userId') userId: string,
    @Body(new ZodValidationPipe(UpdateUserSchema))
    body: z.infer<typeof UpdateUserSchema>,
  ) {
    const updated = await this.adminUsers.updateUser({
      actorId: actor.id,
      userId,
      role: body.role,
      isActive: body.is_active,
    });

    if (!updated) {
      throw new AppError({
        status: 404,
        code: ErrorCodes.NOT_FOUND,
        message: 'User not found',
      });
    }

    return updated;
  }
}
