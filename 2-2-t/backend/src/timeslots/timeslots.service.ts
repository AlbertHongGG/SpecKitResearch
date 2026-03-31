import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { TimeSlotStatus } from '../generated/prisma/client';

@Injectable()
export class TimeSlotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listOpenTimeSlots(input: {
    serviceId?: string;
    from?: Date;
    to?: Date;
  }) {
    const items = await this.prisma.timeSlot.findMany({
      where: {
        status: TimeSlotStatus.OPEN,
        ...(input.serviceId ? { serviceId: input.serviceId } : {}),
        ...(input.from || input.to
          ? {
              startTime: {
                ...(input.from ? { gte: input.from } : {}),
                ...(input.to ? { lte: input.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      items: items.map((ts) => ({
        ...ts,
        remaining: ts.capacity - ts.bookedCount,
      })),
    };
  }

  async listProviderTimeSlots(input: { providerId: string; serviceId: string }) {
    const service = await this.prisma.service.findFirst({
      where: { id: input.serviceId, providerId: input.providerId },
      select: { id: true },
    });
    if (!service) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Service not found.',
      });
    }

    const items = await this.prisma.timeSlot.findMany({
      where: { serviceId: input.serviceId },
      orderBy: { startTime: 'asc' },
    });

    return {
      items: items.map((ts) => ({
        ...ts,
        remaining: ts.capacity - ts.bookedCount,
      })),
    };
  }

  async createProviderTimeSlot(input: {
    providerId: string;
    serviceId: string;
    startTime: Date;
    endTime: Date;
    capacity: number;
    cancelDeadlineAt: Date;
    status: TimeSlotStatus;
  }) {
    if (input.endTime.getTime() <= input.startTime.getTime()) {
      throw new ConflictException({
        code: ErrorCodes.BAD_REQUEST,
        message: 'endTime must be after startTime.',
      });
    }

    return this.prisma.$transaction(async (tx) => {
      const service = await tx.service.findFirst({
        where: { id: input.serviceId, providerId: input.providerId },
        select: { id: true },
      });
      if (!service) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Service not found.',
        });
      }

      const overlap = await tx.timeSlot.findFirst({
        where: {
          serviceId: input.serviceId,
          startTime: { lt: input.endTime },
          endTime: { gt: input.startTime },
        },
        select: { id: true },
      });
      if (overlap) {
        throw new ConflictException({
          code: ErrorCodes.TIMESLOT_OVERLAP,
          message: 'TimeSlot overlaps with an existing slot.',
        });
      }

      const created = await tx.timeSlot.create({
        data: {
          serviceId: input.serviceId,
          startTime: input.startTime,
          endTime: input.endTime,
          capacity: input.capacity,
          cancelDeadlineAt: input.cancelDeadlineAt,
          status: input.status,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.providerId,
          action: 'TIMESLOT_CREATE',
          targetType: 'TimeSlot',
          targetId: created.id,
          afterData: {
            id: created.id,
            serviceId: created.serviceId,
            startTime: created.startTime.toISOString(),
            endTime: created.endTime.toISOString(),
            capacity: created.capacity,
            status: created.status,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return {
        ...created,
        remaining: created.capacity - created.bookedCount,
      };
    });
  }

  async updateProviderTimeSlot(input: {
    providerId: string;
    timeSlotId: string;
    patch: {
      startTime?: Date;
      endTime?: Date;
      capacity?: number;
      cancelDeadlineAt?: Date;
      status?: TimeSlotStatus;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.timeSlot.findFirst({
        where: {
          id: input.timeSlotId,
          service: { providerId: input.providerId },
        },
        include: { service: { select: { id: true } } },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'TimeSlot not found.',
        });
      }

      const nextStart = input.patch.startTime ?? existing.startTime;
      const nextEnd = input.patch.endTime ?? existing.endTime;

      if (nextEnd.getTime() <= nextStart.getTime()) {
        throw new ConflictException({
          code: ErrorCodes.BAD_REQUEST,
          message: 'endTime must be after startTime.',
        });
      }

      if (input.patch.capacity !== undefined && input.patch.capacity < existing.bookedCount) {
        throw new ConflictException({
          code: ErrorCodes.TIMESLOT_CAPACITY_BELOW_BOOKED,
          message: 'capacity cannot be less than bookedCount.',
        });
      }

      if (
        input.patch.startTime !== undefined ||
        input.patch.endTime !== undefined
      ) {
        const overlap = await tx.timeSlot.findFirst({
          where: {
            serviceId: existing.serviceId,
            id: { not: existing.id },
            startTime: { lt: nextEnd },
            endTime: { gt: nextStart },
          },
          select: { id: true },
        });
        if (overlap) {
          throw new ConflictException({
            code: ErrorCodes.TIMESLOT_OVERLAP,
            message: 'TimeSlot overlaps with an existing slot.',
          });
        }
      }

      const updated = await tx.timeSlot.update({
        where: { id: existing.id },
        data: {
          ...(input.patch.startTime ? { startTime: input.patch.startTime } : {}),
          ...(input.patch.endTime ? { endTime: input.patch.endTime } : {}),
          ...(input.patch.capacity !== undefined ? { capacity: input.patch.capacity } : {}),
          ...(input.patch.cancelDeadlineAt ? { cancelDeadlineAt: input.patch.cancelDeadlineAt } : {}),
          ...(input.patch.status ? { status: input.patch.status } : {}),
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.providerId,
          action: 'TIMESLOT_UPDATE',
          targetType: 'TimeSlot',
          targetId: updated.id,
          beforeData: {
            id: existing.id,
            startTime: existing.startTime.toISOString(),
            endTime: existing.endTime.toISOString(),
            capacity: existing.capacity,
            status: existing.status,
          } satisfies Prisma.InputJsonObject,
          afterData: {
            id: updated.id,
            startTime: updated.startTime.toISOString(),
            endTime: updated.endTime.toISOString(),
            capacity: updated.capacity,
            status: updated.status,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return {
        ...updated,
        remaining: updated.capacity - updated.bookedCount,
      };
    });
  }
}
