import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { BookingStatus, UserRole } from '../generated/prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { CurrentUser as CurrentUserType } from '../auth/auth.types';
import { ActiveUserGuard } from '../auth/guards/active-user.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

import { BookingsService } from './bookings.service';

const ListMyBookingsQuerySchema = z
  .object({
    status: z.enum([BookingStatus.PENDING, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED]).optional(),
  })
  .strict();

const CreateBookingBodySchema = z
  .object({
    timeSlotId: z.string().uuid(),
  })
  .strict();

const CancelBookingParamSchema = z
  .object({
    bookingId: z.string().uuid(),
  })
  .strict();

@Controller('bookings')
@UseGuards(JwtAuthGuard, ActiveUserGuard, RolesGuard)
@Roles(UserRole.USER)
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Get()
  listMyBookings(
    @CurrentUser() user: CurrentUserType | undefined,
    @Query(new ZodValidationPipe(ListMyBookingsQuerySchema))
    query: z.infer<typeof ListMyBookingsQuerySchema>,
  ) {
    return this.bookings.listMyBookings({ userId: user!.id, status: query.status });
  }

  @Post()
  async createBooking(
    @CurrentUser() user: CurrentUserType | undefined,
    @Body(new ZodValidationPipe(CreateBookingBodySchema))
    body: z.infer<typeof CreateBookingBodySchema>,
  ) {
    return this.bookings.createBooking({ userId: user!.id, timeSlotId: body.timeSlotId });
  }

  @Post(':bookingId/cancel')
  @HttpCode(204)
  async cancelBooking(
    @CurrentUser() user: CurrentUserType | undefined,
    @Param(new ZodValidationPipe(CancelBookingParamSchema))
    params: z.infer<typeof CancelBookingParamSchema>,
  ) {
    await this.bookings.cancelBooking({ userId: user!.id, bookingId: params.bookingId });
    return;
  }
}
