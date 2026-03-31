import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'
import { presentTimeSlot } from '../timeslots/timeslots.presenter'
import { buildTimeSlotOverlapWhere } from './timeslot-overlap'

@Injectable()
export class ProviderTimeslotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createTimeSlot(input: {
    providerId: string
    serviceId: string
    startTime: Date
    endTime: Date
    capacity: number
    cancelDeadlineAt: Date
  }) {
    if (input.capacity < 1) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }
    if (
      !(input.startTime instanceof Date) ||
      !(input.endTime instanceof Date) ||
      input.endTime <= input.startTime
    ) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid time range' })
    }

    const service = await this.prisma.service.findUnique({ where: { id: input.serviceId } })
    if (!service || service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Service not found' })
    }

    const overlap = await this.prisma.timeSlot.findFirst({
      where: buildTimeSlotOverlapWhere({
        serviceId: input.serviceId,
        startTime: input.startTime,
        endTime: input.endTime,
      }),
    })
    if (overlap) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'TimeSlot overlaps with existing slot',
      })
    }

    const timeSlot = await this.prisma.timeSlot.create({
      data: {
        serviceId: input.serviceId,
        startTime: input.startTime,
        endTime: input.endTime,
        capacity: input.capacity,
        bookedCount: 0,
        status: 'OPEN',
        cancelDeadlineAt: input.cancelDeadlineAt,
      },
    })

    await this.audit.write({
      actorUserId: input.providerId,
      action: 'PROVIDER_TIMESLOT_CREATE',
      targetType: 'TimeSlot',
      targetId: timeSlot.id,
      afterData: {
        id: timeSlot.id,
        serviceId: timeSlot.serviceId,
        startTime: timeSlot.startTime,
        endTime: timeSlot.endTime,
        capacity: timeSlot.capacity,
        status: timeSlot.status,
      },
    })

    return presentTimeSlot(timeSlot)
  }

  async listForService(input: { providerId: string; serviceId: string }) {
    const service = await this.prisma.service.findUnique({ where: { id: input.serviceId } })
    if (!service || service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Service not found' })
    }

    const items = await this.prisma.timeSlot.findMany({
      where: { serviceId: service.id },
      orderBy: { startTime: 'asc' },
    })

    return { items: items.map(presentTimeSlot) }
  }

  async updateTimeSlot(input: {
    providerId: string
    timeSlotId: string
    patch: {
      startTime?: Date
      endTime?: Date
      capacity?: number
      cancelDeadlineAt?: Date
      status?: 'OPEN' | 'CLOSED'
    }
  }) {
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id: input.timeSlotId },
      include: { service: true },
    })
    if (!slot || slot.service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'TimeSlot not found' })
    }

    if (input.patch.capacity !== undefined && input.patch.capacity < 1) {
      throw new BadRequestException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Invalid request body',
      })
    }

    const nextStart = input.patch.startTime ?? slot.startTime
    const nextEnd = input.patch.endTime ?? slot.endTime

    if (nextEnd <= nextStart) {
      throw new BadRequestException({ code: ErrorCodes.BAD_REQUEST, message: 'Invalid time range' })
    }

    if (input.patch.capacity !== undefined && input.patch.capacity < slot.bookedCount) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Capacity cannot be less than bookedCount',
      })
    }

    if (input.patch.startTime !== undefined || input.patch.endTime !== undefined) {
      const overlap = await this.prisma.timeSlot.findFirst({
        where: buildTimeSlotOverlapWhere({
          serviceId: slot.serviceId,
          startTime: nextStart,
          endTime: nextEnd,
          excludeTimeSlotId: slot.id,
        }),
      })
      if (overlap) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'TimeSlot overlaps with existing slot',
        })
      }
    }

    const data: Prisma.TimeSlotUpdateInput = {}
    if (input.patch.startTime) data.startTime = input.patch.startTime
    if (input.patch.endTime) data.endTime = input.patch.endTime
    if (input.patch.capacity !== undefined) data.capacity = input.patch.capacity
    if (input.patch.cancelDeadlineAt) data.cancelDeadlineAt = input.patch.cancelDeadlineAt
    if (input.patch.status === 'OPEN' || input.patch.status === 'CLOSED')
      data.status = input.patch.status

    if (Object.keys(data).length === 0) {
      throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'No changes' })
    }

    const updated = await this.prisma.timeSlot.update({ where: { id: slot.id }, data })

    await this.audit.write({
      actorUserId: input.providerId,
      action: 'PROVIDER_TIMESLOT_UPDATE',
      targetType: 'TimeSlot',
      targetId: updated.id,
      beforeData: {
        id: slot.id,
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity,
        status: slot.status,
      },
      afterData: {
        id: updated.id,
        startTime: updated.startTime,
        endTime: updated.endTime,
        capacity: updated.capacity,
        status: updated.status,
      },
    })

    return presentTimeSlot(updated)
  }
}
