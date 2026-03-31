import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BookingStatus, UserRole } from '../generated/prisma/client';
import { ProviderBookingsService } from './provider-bookings.service';

const BookingIdParamSchema = z
  .object({
    bookingId: z.string().uuid(),
  })
  .strict();

const UpdateBookingStatusBodySchema = z
  .object({
    targetStatus: z.enum([BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.CANCELLED]),
  })
  .strict();

@Controller('provider/bookings')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.PROVIDER)
export class ProviderBookingsController {
  constructor(private readonly bookings: ProviderBookingsService) {}

  @Get()
  listBookings(@CurrentUser() user: CurrentUserType | undefined) {
    return this.bookings.listBookings({ providerId: user!.id });
  }

  @Post(':bookingId/status')
  @HttpCode(200)
  updateBookingStatus(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(BookingIdParamSchema))
    params: z.infer<typeof BookingIdParamSchema>,
    @Body(new ZodValidationPipe(UpdateBookingStatusBodySchema))
    body: z.infer<typeof UpdateBookingStatusBodySchema>,
  ) {
    return this.bookings.updateBookingStatus({
      providerId: user!.id,
      bookingId: params.bookingId,
      targetStatus: body.targetStatus,
    });
  }
}
