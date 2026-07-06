import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ActivityStatus, AuditAction } from '@prisma/client';

import { deriveAutoStatus } from '../activities/activity-status';
import { AuditService } from '../audit/audit.service';
import { utcNow } from '../common/time/time';
import { IdempotencyService } from '../idempotency/idempotency.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensureCancelable, ensureRegisterable } from './registration-rules';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async register(params: { userId: string; activityId: string; idempotencyKey?: string }) {
    const now = utcNow();

    const idem = await this.idempotency.tryStart({
      userId: params.userId,
      scope: 'REGISTER',
      key: params.idempotencyKey,
      ttlSeconds: 60,
    });

    if (!idem.started) {
      return this.currentRegistrationState({ userId: params.userId, activityId: params.activityId });
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const activity = await tx.activity.findUnique({ where: { id: params.activityId } });
          if (!activity) throw new NotFoundException('Not found');

      if (
        activity.status === ActivityStatus.DRAFT ||
        activity.status === ActivityStatus.CLOSED ||
        activity.status === ActivityStatus.ARCHIVED
      ) {
        throw new NotFoundException('Not found');
      }

      const existing = await tx.registration.findUnique({
        where: { userId_activityId: { userId: params.userId, activityId: params.activityId } },
      });

      if (existing && !existing.canceledAt) {
        return {
          activityId: activity.id,
          registered: true,
          registeredCount: activity.registeredCount,
          status: activity.status,
        };
      }

      const check = ensureRegisterable({
        status: activity.status,
        now,
        deadline: activity.deadline,
        date: activity.date,
        registeredCount: activity.registeredCount,
        capacity: activity.capacity,
      });
      if (!check.ok) throw new BadRequestException(check.reason);

      if (existing) {
        await tx.registration.update({ where: { id: existing.id }, data: { canceledAt: null } });
      } else {
        await tx.registration.create({
          data: {
            userId: params.userId,
            activityId: params.activityId,
            canceledAt: null,
          },
        });
      }

      const updatedActivity = await tx.activity.update({
        where: { id: activity.id },
        data: { registeredCount: { increment: 1 } },
      });

      const nextStatus = deriveAutoStatus({
        current: updatedActivity.status,
        registeredCount: updatedActivity.registeredCount,
        capacity: updatedActivity.capacity,
        now,
        deadline: updatedActivity.deadline,
        date: updatedActivity.date,
      });

      const finalActivity =
        nextStatus !== updatedActivity.status
          ? await tx.activity.update({ where: { id: updatedActivity.id }, data: { status: nextStatus } })
          : updatedActivity;

      await this.audit.write(
        {
        actorUserId: params.userId,
        action: AuditAction.REGISTRATION_CREATE,
        targetType: 'Activity',
        targetId: activity.id,
        summary: `User registered for activity ${activity.id}`,
        },
        tx,
      );

          return {
            activityId: activity.id,
            registered: true,
            registeredCount: finalActivity.registeredCount,
            status: finalActivity.status,
          };
        },
        { maxWait: 30_000, timeout: 30_000 },
      );
    } catch (e: any) {
      const code = e?.code;
      if (code === 'P2028' || code === 'P1008') {
        throw new ServiceUnavailableException('Database busy, please retry');
      }
      throw e;
    }
  }

  async cancel(params: { userId: string; activityId: string; idempotencyKey?: string }) {
    const now = utcNow();

    const idem = await this.idempotency.tryStart({
      userId: params.userId,
      scope: 'CANCEL',
      key: params.idempotencyKey,
      ttlSeconds: 60,
    });

    if (!idem.started) {
      return this.currentRegistrationState({ userId: params.userId, activityId: params.activityId });
    }

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          const activity = await tx.activity.findUnique({ where: { id: params.activityId } });
          if (!activity) throw new NotFoundException('Not found');

      if (
        activity.status === ActivityStatus.DRAFT ||
        activity.status === ActivityStatus.CLOSED ||
        activity.status === ActivityStatus.ARCHIVED
      ) {
        throw new NotFoundException('Not found');
      }

      const existing = await tx.registration.findUnique({
        where: { userId_activityId: { userId: params.userId, activityId: params.activityId } },
      });

      if (!existing || existing.canceledAt) {
        return {
          activityId: activity.id,
          registered: false,
          registeredCount: activity.registeredCount,
          status: activity.status,
        };
      }

      const check = ensureCancelable({ now, deadline: activity.deadline, date: activity.date });
      if (!check.ok) throw new BadRequestException(check.reason);

      await tx.registration.update({ where: { id: existing.id }, data: { canceledAt: now } });

      const updatedActivity = await tx.activity.update({
        where: { id: activity.id },
        data: { registeredCount: { decrement: 1 } },
      });

      const nextStatus = deriveAutoStatus({
        current: updatedActivity.status,
        registeredCount: updatedActivity.registeredCount,
        capacity: updatedActivity.capacity,
        now,
        deadline: updatedActivity.deadline,
        date: updatedActivity.date,
      });

      const finalActivity =
        nextStatus !== updatedActivity.status
          ? await tx.activity.update({ where: { id: updatedActivity.id }, data: { status: nextStatus } })
          : updatedActivity;

      await this.audit.write(
        {
        actorUserId: params.userId,
        action: AuditAction.REGISTRATION_CANCEL,
        targetType: 'Activity',
        targetId: activity.id,
        summary: `User canceled registration for activity ${activity.id}`,
        },
        tx,
      );

          return {
            activityId: activity.id,
            registered: false,
            registeredCount: finalActivity.registeredCount,
            status: finalActivity.status,
          };
        },
        { maxWait: 30_000, timeout: 30_000 },
      );
    } catch (e: any) {
      const code = e?.code;
      if (code === 'P2028' || code === 'P1008') {
        throw new ServiceUnavailableException('Database busy, please retry');
      }
      throw e;
    }
  }

  async currentRegistrationState(params: { userId: string; activityId: string }) {
    const activity = await this.prisma.activity.findUnique({ where: { id: params.activityId } });
    if (!activity) throw new NotFoundException('Not found');

    const reg = await this.prisma.registration.findUnique({
      where: { userId_activityId: { userId: params.userId, activityId: params.activityId } },
    });

    const registered = !!reg && !reg.canceledAt;
    return {
      activityId: activity.id,
      registered,
      registeredCount: activity.registeredCount,
      status: activity.status,
    };
  }

  async listMyActivities(userId: string) {
    const regs = await this.prisma.registration.findMany({
      where: { userId, canceledAt: null },
      include: { activity: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: regs.map((r) => ({
        id: r.activity.id,
        title: r.activity.title,
        date: r.activity.date.toISOString(),
        location: r.activity.location,
        status: r.activity.status,
        registeredCount: r.activity.registeredCount,
        capacity: r.activity.capacity,
      })),
    };
  }
}
