import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UserStatusGuard } from '../auth/user-status.guard'
import { ErrorCodes } from '../common/errors/error-codes'
import { ProviderBookingsService } from './provider-bookings.service'

type AuthenticatedRequest = Request & { user?: { id?: string } }

@Controller()
export class ProviderBookingsController {
  constructor(private readonly bookings: ProviderBookingsService) {}

  @Get('provider/time-slots/:timeSlotId/bookings')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async list(@Req() req: AuthenticatedRequest, @Param('timeSlotId') timeSlotId: string) {
    const providerId = req.user?.id
    if (!providerId || !timeSlotId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }
    return this.bookings.listBookingsForTimeSlot({ providerId, timeSlotId })
  }

  @Post('provider/bookings/:bookingId/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async complete(@Req() req: AuthenticatedRequest, @Param('bookingId') bookingId: string) {
    const providerId = req.user?.id
    if (!providerId || !bookingId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const booking = await this.bookings.completeBooking({ providerId, bookingId })
    return { booking }
  }

  @Post('provider/bookings/:bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async cancel(@Req() req: AuthenticatedRequest, @Param('bookingId') bookingId: string) {
    const providerId = req.user?.id
    if (!providerId || !bookingId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const booking = await this.bookings.cancelBooking({ providerId, bookingId })
    return { booking }
  }
}
