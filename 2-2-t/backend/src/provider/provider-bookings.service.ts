import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { BookingStatus } from '../generated/prisma/client';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { isBookingStatusTransitionAllowed } from '../bookings/booking-state-machine';

@Injectable()
export class ProviderBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listBookings(input: { providerId: string }) {
    const rows = await this.prisma.booking.findMany({
      where: {
        timeSlot: {
          service: {
            providerId: input.providerId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        status: true,
        createdAt: true,
        timeSlotId: true,
        timeSlot: {
          select: {
            startTime: true,
            endTime: true,
            cancelDeadlineAt: true,
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return {
      items: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user.email,
        serviceId: r.timeSlot.service.id,
        serviceName: r.timeSlot.service.name,
        timeSlotId: r.timeSlotId,
        startTime: r.timeSlot.startTime,
        endTime: r.timeSlot.endTime,
        cancelDeadlineAt: r.timeSlot.cancelDeadlineAt,
        status: r.status,
        createdAt: r.createdAt,
      })),
    };
  }

  async updateBookingStatus(input: {
    providerId: string;
    bookingId: string;
    targetStatus: BookingStatus;
    now?: Date;
  }) {
    const now = input.now ?? new Date();

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findFirst({
        where: {
          id: input.bookingId,
          timeSlot: {
            service: {
              providerId: input.providerId,
            },
          },
        },
        select: {
          id: true,
          timeSlotId: true,
          status: true,
          cancelledAt: true,
          completedAt: true,
        },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Booking not found.',
        });
      }

      if (!isBookingStatusTransitionAllowed(existing.status, input.targetStatus)) {
        throw new ConflictException({
          code: ErrorCodes.BOOKING_STATE_INVALID_TRANSITION,
          message: 'Invalid booking status transition.',
        });
      }

      const willCancel = input.targetStatus === BookingStatus.CANCELLED;
      const willComplete = input.targetStatus === BookingStatus.COMPLETED;

      const updated = await tx.booking.update({
        where: { id: existing.id },
        data: {
          status: input.targetStatus,
          ...(willCancel ? { cancelledAt: now } : {}),
          ...(willComplete ? { completedAt: now } : {}),
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

      if (willCancel && (existing.status === BookingStatus.PENDING || existing.status === BookingStatus.CONFIRMED)) {
        const released = await tx.$executeRaw`
          UPDATE "TimeSlot"
          SET "bookedCount" = "bookedCount" - 1
          WHERE "id" = ${existing.timeSlotId}
            AND "bookedCount" > 0
        `;

        if (released === 0) {
          throw new ConflictException({
            code: ErrorCodes.CONFLICT,
            message: 'Unable to release seat.',
          });
        }
      }

      await this.auditLogs.write(
        {
          actorUserId: input.providerId,
          action: 'BOOKING_STATUS_UPDATE',
          targetType: 'Booking',
          targetId: updated.id,
          beforeData: {
            id: existing.id,
            status: existing.status,
            cancelledAt: existing.cancelledAt ?? null,
            completedAt: existing.completedAt ?? null,
          } satisfies Prisma.InputJsonObject,
          afterData: {
            id: updated.id,
            status: updated.status,
            cancelledAt: updated.cancelledAt ?? null,
            completedAt: updated.completedAt ?? null,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return updated;
    });
  }
}
