import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'
import { assertBookingTransition } from './booking-state'

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createBooking(input: { userId: string; timeSlotId: string }) {
    return this.prisma.$transaction(async (tx) => {
      const timeSlot = await tx.timeSlot.findUnique({
        where: { id: input.timeSlotId },
        include: { service: true },
      })
      if (!timeSlot) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'TimeSlot not found' })
      }
      if (timeSlot.status !== 'OPEN') {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'TimeSlot not open' })
      }
      if (timeSlot.service.status !== 'ACTIVE') {
        throw new ConflictException({ code: ErrorCodes.CONFLICT, message: 'Service not active' })
      }

      const duplicate = await tx.booking.findFirst({
        where: {
          userId: input.userId,
          timeSlotId: input.timeSlotId,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      if (duplicate) {
        throw new ConflictException({
          code: ErrorCodes.DUPLICATE_BOOKING,
          message: 'Duplicate booking',
        })
      }

      if (timeSlot.bookedCount >= timeSlot.capacity) {
        throw new ConflictException({
          code: ErrorCodes.CAPACITY_FULL,
          message: 'Capacity full',
        })
      }

      const updated = await tx.timeSlot.updateMany({
        where: {
          id: input.timeSlotId,
          status: 'OPEN',
          bookedCount: { lt: timeSlot.capacity },
        },
        data: { bookedCount: { increment: 1 } },
      })
      if (updated.count !== 1) {
        throw new ConflictException({
          code: ErrorCodes.CAPACITY_FULL,
          message: 'Capacity full',
        })
      }

      const booking = await tx.booking.create({
        data: {
          userId: input.userId,
          timeSlotId: input.timeSlotId,
          status: 'CONFIRMED',
        },
      })

      await this.audit.write(
        {
          actorUserId: input.userId,
          action: 'USER_BOOKING_CREATE',
          targetType: 'Booking',
          targetId: booking.id,
          afterData: {
            id: booking.id,
            userId: booking.userId,
            timeSlotId: booking.timeSlotId,
            status: booking.status,
          },
        },
        tx,
      )

      return booking
    })
  }

  async listMine(userId: string) {
    const items = await this.prisma.booking.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })
    return { items }
  }

  async cancelBooking(input: { userId: string; bookingId: string }) {
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        include: { timeSlot: true },
      })
      if (!booking) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Booking not found' })
      }

      if (booking.userId !== input.userId) {
        // Avoid leaking existence across users.
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Booking not found' })
      }

      if (booking.status === 'CANCELLED') {
        throw new ConflictException({
          code: ErrorCodes.ALREADY_CANCELLED,
          message: 'Booking already cancelled',
        })
      }

      if (booking.status === 'COMPLETED') {
        throw new ConflictException({
          code: ErrorCodes.INVALID_TRANSITION,
          message: 'Completed bookings cannot be cancelled',
        })
      }

      assertBookingTransition(booking.status, 'CANCELLED')

      if (now.getTime() > booking.timeSlot.cancelDeadlineAt.getTime()) {
        throw new ConflictException({
          code: ErrorCodes.DEADLINE_PASSED,
          message: 'Cancel deadline passed',
        })
      }

      const updated = await tx.booking.updateMany({
        where: {
          id: booking.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        data: { status: 'CANCELLED', cancelledAt: now },
      })

      if (updated.count !== 1) {
        // Another request may have raced and cancelled/completed it already.
        const latest = await tx.booking.findUnique({ where: { id: booking.id } })
        if (!latest) {
          throw new NotFoundException({
            code: ErrorCodes.NOT_FOUND,
            message: 'Booking not found',
          })
        }
        if (latest.status === 'CANCELLED') {
          throw new ConflictException({
            code: ErrorCodes.ALREADY_CANCELLED,
            message: 'Booking already cancelled',
          })
        }
        throw new ConflictException({
          code: ErrorCodes.INVALID_TRANSITION,
          message: 'Booking cannot be cancelled',
        })
      }

      const updatedSlot = await tx.timeSlot.updateMany({
        where: { id: booking.timeSlotId, bookedCount: { gt: 0 } },
        data: { bookedCount: { decrement: 1 } },
      })
      if (updatedSlot.count !== 1) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Failed to release capacity',
        })
      }

      const updatedBooking = await tx.booking.findUnique({ where: { id: booking.id } })
      if (!updatedBooking) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Booking not found' })
      }

      await this.audit.write(
        {
          actorUserId: input.userId,
          action: 'USER_BOOKING_CANCEL',
          targetType: 'Booking',
          targetId: updatedBooking.id,
          beforeData: {
            id: booking.id,
            status: booking.status,
            cancelledAt: booking.cancelledAt,
          },
          afterData: {
            id: updatedBooking.id,
            status: updatedBooking.status,
            cancelledAt: updatedBooking.cancelledAt,
          },
        },
        tx,
      )

      return updatedBooking
    })
  }
}
