import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditResult } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

export type AdminRegistrationItem = {
  userId: string;
  name: string;
  email: string;
  registeredAt: string;
  canceledAt: string | null;
};

@Injectable()
export class AdminRegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async assertActivityExists(activityId: string) {
    const activity = await this.prisma.activity.findUnique({
      where: { id: activityId },
      select: { id: true },
    });

    if (!activity) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }
  }

  async list(input: { activityId: string; includeCancelled: boolean }) {
    await this.assertActivityExists(input.activityId);

    const registrations = await this.prisma.registration.findMany({
      where: {
        activityId: input.activityId,
        ...(input.includeCancelled ? {} : { canceledAt: null }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const items: AdminRegistrationItem[] = registrations.map((r) => ({
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      registeredAt: r.createdAt.toISOString(),
      canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
    }));

    return { items };
  }

  async exportCsv(input: { actorUserId: string; activityId: string }) {
    await this.assertActivityExists(input.activityId);

    const registrations = await this.prisma.registration.findMany({
      where: { activityId: input.activityId, canceledAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const items: AdminRegistrationItem[] = registrations.map((r) => ({
      userId: r.userId,
      name: r.user.name,
      email: r.user.email,
      registeredAt: r.createdAt.toISOString(),
      canceledAt: r.canceledAt ? r.canceledAt.toISOString() : null,
    }));

    await this.audit.writeRegistrationExportCsv({
      actorUserId: input.actorUserId,
      activityId: input.activityId,
      rowCount: items.length,
      result: AuditResult.success,
    });

    return items;
  }
}
