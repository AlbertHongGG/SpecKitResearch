import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../common/db/prisma.service'
import { ErrorCodes } from '../common/errors/error-codes'
import { assertBookingTransition } from '../bookings/booking-state'

@Injectable()
export class ProviderBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listBookingsForTimeSlot(input: { providerId: string; timeSlotId: string }) {
    const slot = await this.prisma.timeSlot.findUnique({
      where: { id: input.timeSlotId },
      include: { service: true },
    })
    if (!slot || slot.service.providerId !== input.providerId) {
      throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'TimeSlot not found' })
    }

    const items = await this.prisma.booking.findMany({
      where: { timeSlotId: slot.id },
      orderBy: { createdAt: 'desc' },
    })

    return { items }
  }

  async completeBooking(input: { providerId: string; bookingId: string }) {
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        include: { timeSlot: { include: { service: true } } },
      })
      if (!booking || booking.timeSlot.service.providerId !== input.providerId) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Booking not found' })
      }

      if (booking.status === 'COMPLETED') {
        throw new ConflictException({
          code: ErrorCodes.INVALID_TRANSITION,
          message: 'Booking already completed',
        })
      }
      if (booking.status === 'CANCELLED') {
        throw new ConflictException({
          code: ErrorCodes.INVALID_TRANSITION,
          message: 'Cancelled bookings cannot be completed',
        })
      }

      assertBookingTransition(booking.status, 'COMPLETED')

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED', completedAt: now },
      })

      await this.audit.write(
        {
          actorUserId: input.providerId,
          action: 'PROVIDER_BOOKING_COMPLETE',
          targetType: 'Booking',
          targetId: updated.id,
          beforeData: { id: booking.id, status: booking.status, completedAt: booking.completedAt },
          afterData: { id: updated.id, status: updated.status, completedAt: updated.completedAt },
        },
        tx,
      )

      return updated
    })
  }

  async cancelBooking(input: { providerId: string; bookingId: string }) {
    const now = new Date()

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: input.bookingId },
        include: { timeSlot: { include: { service: true } } },
      })
      if (!booking || booking.timeSlot.service.providerId !== input.providerId) {
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

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED', cancelledAt: now },
      })

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

      await this.audit.write(
        {
          actorUserId: input.providerId,
          action: 'PROVIDER_BOOKING_CANCEL',
          targetType: 'Booking',
          targetId: updated.id,
          beforeData: { id: booking.id, status: booking.status, cancelledAt: booking.cancelledAt },
          afterData: { id: updated.id, status: updated.status, cancelledAt: updated.cancelledAt },
        },
        tx,
      )

      return updated
    })
  }
}
