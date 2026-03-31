import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { BookingStatus, ServiceStatus, TimeSlotStatus } from '../generated/prisma/client';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

export type CreateBookingInput = {
  userId: string;
  timeSlotId: string;
};

export type CancelBookingInput = {
  userId: string;
  bookingId: string;
  now?: Date;
};

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listMyBookings(input: { userId: string; status?: BookingStatus }) {
    const items = await this.prisma.booking.findMany({
      where: {
        userId: input.userId,
        ...(input.status ? { status: input.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        timeSlotId: true,
        status: true,
        createdAt: true,
        cancelledAt: true,
        completedAt: true,
      },
    });

    return { items };
  }

  async createBooking(input: CreateBookingInput) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Conditional seat reservation (no oversell): bookedCount++ only when < capacity.
        // Also enforce service/timeslot availability.
        const updated = await tx.$executeRaw`
          UPDATE "TimeSlot"
          SET "bookedCount" = "bookedCount" + 1
          WHERE "id" = ${input.timeSlotId}
            AND "status" = ${TimeSlotStatus.OPEN}
            AND "bookedCount" < "capacity"
            AND EXISTS (
              SELECT 1 FROM "Service" s
              WHERE s."id" = "TimeSlot"."serviceId"
                AND s."status" = ${ServiceStatus.ACTIVE}
            )
        `;

        if (updated === 0) {
          const exists = await tx.timeSlot.findUnique({
            where: { id: input.timeSlotId },
            select: { id: true },
          });

          if (!exists) {
            throw new NotFoundException({
              code: ErrorCodes.NOT_FOUND,
              message: 'TimeSlot not found.',
            });
          }

          throw new ConflictException({
            code: ErrorCodes.BOOKING_SEAT_FULL,
            message: 'TimeSlot is full or not available.',
          });
        }

        const booking = await tx.booking.create({
          data: {
            userId: input.userId,
            timeSlotId: input.timeSlotId,
            status: BookingStatus.PENDING,
          },
          select: {
            id: true,
            userId: true,
            timeSlotId: true,
            status: true,
            createdAt: true,
            cancelledAt: true,
            completedAt: true,
          },
        });

        await this.auditLogs.write(
          {
            actorUserId: input.userId,
            action: 'BOOKING_CREATE',
            targetType: 'Booking',
            targetId: booking.id,
            afterData: {
              id: booking.id,
              userId: booking.userId,
              timeSlotId: booking.timeSlotId,
              status: booking.status,
            } satisfies Prisma.InputJsonObject,
          },
          tx,
        );

        return booking;
      });
    } catch (e: unknown) {
      // Unique constraint: duplicate booking for (userId, timeSlotId)
      if (
        typeof e === 'object' &&
        e !== null &&
        'code' in e &&
        (e as { code?: unknown }).code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCodes.BOOKING_DUPLICATE,
          message: 'Booking already exists for this time slot.',
        });
      }
      throw e;
    }
  }

  async cancelBooking(input: CancelBookingInput) {
    const now = input.now ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          userId: input.userId,
        },
        select: {
          id: true,
          userId: true,
          timeSlotId: true,
          status: true,
          cancelledAt: true,
          timeSlot: {
            select: {
              id: true,
              cancelDeadlineAt: true,
            },
          },
        },
      });

      if (!booking) {
        // Hide existence to prevent IDOR leakage.
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Booking not found.',
        });
      }

      if (booking.status === BookingStatus.CANCELLED) {
        throw new ConflictException({
          code: ErrorCodes.BOOKING_ALREADY_CANCELLED,
          message: 'Booking already cancelled.',
        });
      }

      if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED) {
        throw new ConflictException({
          code: ErrorCodes.BOOKING_NOT_CANCELLABLE,
          message: 'Booking cannot be cancelled.',
        });
      }

      if (now.getTime() > booking.timeSlot.cancelDeadlineAt.getTime()) {
        throw new ConflictException({
          code: ErrorCodes.BOOKING_NOT_CANCELLABLE,
          message: 'Cancel deadline has passed.',
        });
      }

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: now },
        select: {
          id: true,
          userId: true,
          timeSlotId: true,
          status: true,
          createdAt: true,
          cancelledAt: true,
          completedAt: true,
        },
      });

      const released = await tx.$executeRaw`
        UPDATE "TimeSlot"
        SET "bookedCount" = "bookedCount" - 1
        WHERE "id" = ${booking.timeSlotId}
          AND "bookedCount" > 0
      `;

      if (released === 0) {
        // Invariant violation (should not happen if create/cancel are the only writers).
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Unable to release seat.',
        });
      }

      await this.auditLogs.write(
        {
          actorUserId: input.userId,
          action: 'BOOKING_CANCEL',
          targetType: 'Booking',
          targetId: updated.id,
          beforeData: {
            id: booking.id,
            status: booking.status,
            cancelledAt: booking.cancelledAt ?? null,
          } satisfies Prisma.InputJsonObject,
          afterData: {
            id: updated.id,
            status: updated.status,
            cancelledAt: updated.cancelledAt,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return updated;
    });
  }

}
