import { Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UserRole } from '../generated/prisma/client';

import { AdminService } from './admin.service';

const UserIdParamSchema = z
  .object({
    userId: z.string().uuid(),
  })
  .strict();

const ServiceIdParamSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();

@Controller('admin')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers();
  }

  @Post('users/:userId/suspend')
  @HttpCode(204)
  async suspendUser(
    @CurrentUser() actor: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(UserIdParamSchema))
    params: z.infer<typeof UserIdParamSchema>,
  ) {
    await this.admin.suspendUser({ actorUserId: actor!.id, userId: params.userId });
    return;
  }

  @Post('users/:userId/activate')
  @HttpCode(204)
  async activateUser(
    @CurrentUser() actor: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(UserIdParamSchema))
    params: z.infer<typeof UserIdParamSchema>,
  ) {
    await this.admin.activateUser({ actorUserId: actor!.id, userId: params.userId });
    return;
  }

  @Get('services')
  listServices() {
    return this.admin.listServices();
  }

  @Post('services/:serviceId/activate')
  @HttpCode(204)
  async activateService(
    @CurrentUser() actor: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
  ) {
    await this.admin.activateService({ actorUserId: actor!.id, serviceId: params.serviceId });
    return;
  }

  @Post('services/:serviceId/inactivate')
  @HttpCode(204)
  async inactivateService(
    @CurrentUser() actor: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
  ) {
    await this.admin.inactivateService({ actorUserId: actor!.id, serviceId: params.serviceId });
    return;
  }
}
