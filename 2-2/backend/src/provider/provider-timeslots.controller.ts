import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { ProviderTimeslotsService } from './provider-timeslots.service'

type AuthenticatedRequest = Request & { user?: { id?: string } }

function asBodyRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function parseDateTime(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

@Controller()
export class ProviderTimeslotsController {
  constructor(private readonly timeslots: ProviderTimeslotsService) {}

  @Get('provider/services/:serviceId/time-slots')
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async listForService(@Req() req: AuthenticatedRequest, @Param('serviceId') serviceId: string) {
    const providerId = req.user?.id
    if (!providerId || !serviceId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }
    return this.timeslots.listForService({ providerId, serviceId })
  }

  @Post('provider/services/:serviceId/time-slots')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async create(
    @Req() req: AuthenticatedRequest,
    @Param('serviceId') serviceId: string,
    @Body() body: unknown,
  ) {
    const providerId = req.user?.id
    const parsedBody = asBodyRecord(body)
    const startTime = parseDateTime(parsedBody.startTime)
    const endTime = parseDateTime(parsedBody.endTime)
    const cancelDeadlineAt = parseDateTime(parsedBody.cancelDeadlineAt)
    const capacity = typeof parsedBody.capacity === 'number' ? parsedBody.capacity : NaN

    if (
      !providerId ||
      !serviceId ||
      !startTime ||
      !endTime ||
      !cancelDeadlineAt ||
      !Number.isFinite(capacity)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const timeSlot = await this.timeslots.createTimeSlot({
      providerId,
      serviceId,
      startTime,
      endTime,
      capacity,
      cancelDeadlineAt,
    })

    return { timeSlot }
  }

  @Patch('provider/time-slots/:timeSlotId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, UserStatusGuard, RolesGuard)
  @Roles('PROVIDER')
  async patch(
    @Req() req: AuthenticatedRequest,
    @Param('timeSlotId') timeSlotId: string,
    @Body() body: unknown,
  ) {
    const providerId = req.user?.id
    const parsedBody = asBodyRecord(body)
    if (!providerId || !timeSlotId) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid request' })
    }

    const startTime =
      parsedBody.startTime !== undefined ? parseDateTime(parsedBody.startTime) : undefined
    const endTime = parsedBody.endTime !== undefined ? parseDateTime(parsedBody.endTime) : undefined
    const cancelDeadlineAt =
      parsedBody.cancelDeadlineAt !== undefined
        ? parseDateTime(parsedBody.cancelDeadlineAt)
        : undefined

    if (startTime === null || endTime === null || cancelDeadlineAt === null) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const capacity =
      parsedBody.capacity !== undefined
        ? typeof parsedBody.capacity === 'number'
          ? parsedBody.capacity
          : NaN
        : undefined
    if (capacity !== undefined && !Number.isFinite(capacity)) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const status =
      parsedBody.status === 'OPEN' || parsedBody.status === 'CLOSED' ? parsedBody.status : undefined

    const timeSlot = await this.timeslots.updateTimeSlot({
      providerId,
      timeSlotId,
      patch: {
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined,
        capacity,
        cancelDeadlineAt: cancelDeadlineAt ?? undefined,
        status,
      },
    })

    return { timeSlot }
  }
}
