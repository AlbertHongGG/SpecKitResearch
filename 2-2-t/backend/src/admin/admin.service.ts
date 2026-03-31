import { Injectable, NotFoundException } from '@nestjs/common';

import type { Prisma } from '../generated/prisma/client';
import { BookingStatus, ServiceStatus, UserStatus } from '../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listUsers() {
    const items = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return { items };
  }

  async suspendUser(input: { actorUserId: string; userId: string }) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      if (!before) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found.',
        });
      }

      if (before.status === UserStatus.SUSPENDED) return;

      const after = await tx.user.update({
        where: { id: input.userId },
        data: { status: UserStatus.SUSPENDED },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.actorUserId,
          action: 'USER_SUSPEND',
          targetType: 'User',
          targetId: input.userId,
          beforeData: before satisfies Prisma.InputJsonObject,
          afterData: after satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });
  }

  async activateUser(input: { actorUserId: string; userId: string }) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUnique({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      if (!before) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'User not found.',
        });
      }

      if (before.status === UserStatus.ACTIVE) return;

      const after = await tx.user.update({
        where: { id: input.userId },
        data: { status: UserStatus.ACTIVE },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.actorUserId,
          action: 'USER_ACTIVATE',
          targetType: 'User',
          targetId: input.userId,
          beforeData: before satisfies Prisma.InputJsonObject,
          afterData: after satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });
  }

  async listServices() {
    const items = await this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        providerId: true,
        name: true,
        description: true,
        durationMinutes: true,
        status: true,
        createdAt: true,
      },
    });

    return { items };
  }

  async activateService(input: { actorUserId: string; serviceId: string }) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.service.findUnique({
        where: { id: input.serviceId },
        select: {
          id: true,
          providerId: true,
          name: true,
          description: true,
          durationMinutes: true,
          status: true,
          createdAt: true,
        },
      });

      if (!before) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Service not found.',
        });
      }

      if (before.status === ServiceStatus.ACTIVE) return;

      const after = await tx.service.update({
        where: { id: input.serviceId },
        data: { status: ServiceStatus.ACTIVE },
        select: {
          id: true,
          providerId: true,
          name: true,
          description: true,
          durationMinutes: true,
          status: true,
          createdAt: true,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.actorUserId,
          action: 'SERVICE_ACTIVATE',
          targetType: 'Service',
          targetId: input.serviceId,
          beforeData: before satisfies Prisma.InputJsonObject,
          afterData: after satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });
  }

  async inactivateService(input: { actorUserId: string; serviceId: string }) {
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.service.findUnique({
        where: { id: input.serviceId },
        select: {
          id: true,
          providerId: true,
          name: true,
          description: true,
          durationMinutes: true,
          status: true,
          createdAt: true,
        },
      });

      if (!before) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Service not found.',
        });
      }

      if (before.status === ServiceStatus.INACTIVE) return;

      const after = await tx.service.update({
        where: { id: input.serviceId },
        data: { status: ServiceStatus.INACTIVE },
        select: {
          id: true,
          providerId: true,
          name: true,
          description: true,
          durationMinutes: true,
          status: true,
          createdAt: true,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.actorUserId,
          action: 'SERVICE_INACTIVATE',
          targetType: 'Service',
          targetId: input.serviceId,
          beforeData: before satisfies Prisma.InputJsonObject,
          afterData: after satisfies Prisma.InputJsonObject,
        },
        tx,
      );
    });
  }

  async reportSummary() {
    const [bookings, cancelled, activeServices] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
      this.prisma.service.count({ where: { status: ServiceStatus.ACTIVE } }),
    ]);

    const cancellationRate = bookings === 0 ? 0 : cancelled / bookings;

    return {
      totals: {
        bookings,
        cancelled,
      },
      cancellationRate,
      activeServices,
      generatedAt: new Date().toISOString(),
    };
  }
}
