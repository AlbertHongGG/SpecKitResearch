import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'

import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import { UserStatusGuard } from '../auth/user-status.guard'
import { ErrorCodes } from '../common/errors/error-codes'
import { BookingsService } from './bookings.service'

@Controller()
export class BookingsController {
  constructor(private readonly bookings: BookingsService) {}

  @Post('bookings')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('USER')
  async createBooking(@Req() req: any, @Body() body: any) {
    const userId = req.user?.id as string | undefined
    const timeSlotId = typeof body?.timeSlotId === 'string' ? body.timeSlotId : ''
    if (!userId || !timeSlotId) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const booking = await this.bookings.createBooking({ userId, timeSlotId })
    return { booking }
  }

  @Get('me/bookings')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('USER')
  async listMine(@Req() req: any) {
    const userId = req.user?.id as string | undefined
    if (!userId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid user' })
    }
    return this.bookings.listMine(userId)
  }

  @Post('bookings/:bookingId/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('USER')
  async cancelBooking(@Req() req: any, @Param('bookingId') bookingId: string) {
    const userId = req.user?.id as string | undefined
    if (!userId || !bookingId) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request',
      })
    }

    const booking = await this.bookings.cancelBooking({ userId, bookingId })
    return { booking }
  }
}
