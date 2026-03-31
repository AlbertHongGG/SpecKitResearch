import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ServiceStatus, UserRole } from '../generated/prisma/client';
import { ServicesService } from '../services/services.service';

const ServiceIdParamSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();

const CreateServiceBodySchema = z
  .object({
    name: z.string().min(1),
    description: z.string(),
    durationMinutes: z.number().int().min(1),
    status: z.enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE]).optional(),
  })
  .strict();

const UpdateServiceBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    durationMinutes: z.number().int().min(1).optional(),
    status: z.enum([ServiceStatus.ACTIVE, ServiceStatus.INACTIVE]).optional(),
  })
  .strict();

@Controller('provider/services')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class ProviderServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  listMyServices(@CurrentUser() user: CurrentUserType | undefined) {
    return this.services.listProviderServices({ providerId: user!.id });
  }

  @Post()
  @HttpCode(201)
  createService(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body(new ZodValidationPipe(CreateServiceBodySchema))
    body: z.infer<typeof CreateServiceBodySchema>,
  ) {
    return this.services.createProviderService({
      providerId: user!.id,
      name: body.name,
      description: body.description,
      durationMinutes: body.durationMinutes,
      status: body.status ?? ServiceStatus.ACTIVE,
    });
  }

  @Patch(':serviceId')
  updateService(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
    @Body(new ZodValidationPipe(UpdateServiceBodySchema))
    body: z.infer<typeof UpdateServiceBodySchema>,
  ) {
    return this.services.updateProviderService({
      providerId: user!.id,
      serviceId: params.serviceId,
      patch: body,
    });
  }
}
