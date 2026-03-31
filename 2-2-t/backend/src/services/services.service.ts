import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';

import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { ServiceStatus, TimeSlotStatus } from '../generated/prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ServicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async listPublicServices() {
    const items = await this.prisma.service.findMany({
      where: { status: ServiceStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });

    return { items };
  }

  async getPublicServiceDetail(serviceId: string) {
    const service = await this.prisma.service.findFirst({
      where: {
        id: serviceId,
        status: ServiceStatus.ACTIVE,
      },
    });

    if (!service) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Service not found.',
      });
    }

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: {
        serviceId,
        status: TimeSlotStatus.OPEN,
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      service,
      timeSlots: timeSlots.map((ts) => ({
        ...ts,
        remaining: ts.capacity - ts.bookedCount,
      })),
    };
  }

  async listProviderServices(input: { providerId: string }) {
    const items = await this.prisma.service.findMany({
      where: { providerId: input.providerId },
      orderBy: { createdAt: 'desc' },
    });
    return { items };
  }

  async createProviderService(input: {
    providerId: string;
    name: string;
    description: string;
    durationMinutes: number;
    status: ServiceStatus;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.service.create({
        data: {
          providerId: input.providerId,
          name: input.name,
          description: input.description,
          durationMinutes: input.durationMinutes,
          status: input.status,
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.providerId,
          action: 'SERVICE_CREATE',
          targetType: 'Service',
          targetId: created.id,
          afterData: {
            id: created.id,
            providerId: created.providerId,
            name: created.name,
            status: created.status,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return created;
    });
  }

  async updateProviderService(input: {
    providerId: string;
    serviceId: string;
    patch: {
      name?: string;
      description?: string;
      durationMinutes?: number;
      status?: ServiceStatus;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.service.findFirst({
        where: { id: input.serviceId, providerId: input.providerId },
      });

      if (!existing) {
        throw new NotFoundException({
          code: ErrorCodes.NOT_FOUND,
          message: 'Service not found.',
        });
      }

      const updated = await tx.service.update({
        where: { id: existing.id },
        data: {
          ...(input.patch.name !== undefined ? { name: input.patch.name } : {}),
          ...(input.patch.description !== undefined ? { description: input.patch.description } : {}),
          ...(input.patch.durationMinutes !== undefined
            ? { durationMinutes: input.patch.durationMinutes }
            : {}),
          ...(input.patch.status !== undefined ? { status: input.patch.status } : {}),
        },
      });

      await this.auditLogs.write(
        {
          actorUserId: input.providerId,
          action: 'SERVICE_UPDATE',
          targetType: 'Service',
          targetId: updated.id,
          beforeData: {
            id: existing.id,
            name: existing.name,
            description: existing.description,
            durationMinutes: existing.durationMinutes,
            status: existing.status,
          } satisfies Prisma.InputJsonObject,
          afterData: {
            id: updated.id,
            name: updated.name,
            description: updated.description,
            durationMinutes: updated.durationMinutes,
            status: updated.status,
          } satisfies Prisma.InputJsonObject,
        },
        tx,
      );

      return updated;
    });
  }
}
