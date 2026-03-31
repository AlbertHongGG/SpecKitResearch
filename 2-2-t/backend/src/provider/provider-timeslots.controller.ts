import { Body, Controller, Get, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { TimeSlotStatus, UserRole } from '../generated/prisma/client';
import { TimeSlotsService } from '../timeslots/timeslots.service';

const ServiceIdParamSchema = z
  .object({
    serviceId: z.string().uuid(),
  })
  .strict();

const TimeSlotIdParamSchema = z
  .object({
    timeSlotId: z.string().uuid(),
  })
  .strict();

const CreateTimeSlotBodySchema = z
  .object({
    startTime: z.string().datetime(),
    endTime: z.string().datetime(),
    capacity: z.number().int().min(0),
    cancelDeadlineAt: z.string().datetime(),
    status: z.enum([TimeSlotStatus.OPEN, TimeSlotStatus.CLOSED]).optional(),
  })
  .strict();

const UpdateTimeSlotBodySchema = z
  .object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    capacity: z.number().int().min(0).optional(),
    cancelDeadlineAt: z.string().datetime().optional(),
    status: z.enum([TimeSlotStatus.OPEN, TimeSlotStatus.CLOSED]).optional(),
  })
  .strict();

@Controller('provider')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class ProviderTimeSlotsController {
  constructor(private readonly timeSlots: TimeSlotsService) {}

  @Get('services/:serviceId/timeslots')
  listServiceTimeSlots(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
  ) {
    return this.timeSlots.listProviderTimeSlots({
      providerId: user!.id,
      serviceId: params.serviceId,
    });
  }

  @Post('services/:serviceId/timeslots')
  @HttpCode(201)
  createTimeSlot(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(ServiceIdParamSchema))
    params: z.infer<typeof ServiceIdParamSchema>,
    @Body(new ZodValidationPipe(CreateTimeSlotBodySchema))
    body: z.infer<typeof CreateTimeSlotBodySchema>,
  ) {
    return this.timeSlots.createProviderTimeSlot({
      providerId: user!.id,
      serviceId: params.serviceId,
      startTime: new Date(body.startTime),
      endTime: new Date(body.endTime),
      capacity: body.capacity,
      cancelDeadlineAt: new Date(body.cancelDeadlineAt),
      status: body.status ?? TimeSlotStatus.OPEN,
    });
  }

  @Patch('timeslots/:timeSlotId')
  updateTimeSlot(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(TimeSlotIdParamSchema))
    params: z.infer<typeof TimeSlotIdParamSchema>,
    @Body(new ZodValidationPipe(UpdateTimeSlotBodySchema))
    body: z.infer<typeof UpdateTimeSlotBodySchema>,
  ) {
    return this.timeSlots.updateProviderTimeSlot({
      providerId: user!.id,
      timeSlotId: params.timeSlotId,
      patch: {
        ...(body.startTime ? { startTime: new Date(body.startTime) } : {}),
        ...(body.endTime ? { endTime: new Date(body.endTime) } : {}),
        ...(body.capacity !== undefined ? { capacity: body.capacity } : {}),
        ...(body.cancelDeadlineAt ? { cancelDeadlineAt: new Date(body.cancelDeadlineAt) } : {}),
        ...(body.status ? { status: body.status } : {}),
      },
    });
  }
}
