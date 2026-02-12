import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Activity, Registration } from '@prisma/client';
import { AuditResult } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';
import { syncActivityStatusWithCapacity } from '../activities/activity-status-updater';
import { presentRegistration } from './registration.presenter';

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private ensureRegisterable(activity: Activity, now: Date) {
    if (activity.status === 'closed') {
      throw new ConflictException({
        code: ErrorCodes.CLOSED,
        message: 'Registration closed',
      });
    }

    if (activity.status !== 'published' && activity.status !== 'full') {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Not allowed',
      });
    }

    if (now.getTime() >= activity.date.getTime()) {
      throw new ConflictException({
        code: ErrorCodes.ENDED,
        message: 'Activity already ended',
      });
    }

    if (now.getTime() >= activity.deadline.getTime()) {
      throw new ConflictException({
        code: ErrorCodes.DEADLINE_PASSED,
        message: 'Deadline passed',
      });
    }

    if (activity.status === 'full' || activity.registeredCount >= activity.capacity) {
      throw new ConflictException({
        code: ErrorCodes.FULL,
        message: 'Activity is full',
      });
    }
  }

  async register(input: { activityId: string; userId: string }) {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({ where: { id: input.activityId } });
      if (!activity) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Not found' });
      }

      // idempotent semantics
      const existing = await tx.registration.findUnique({
        where: {
          userId_activityId: {
            userId: input.userId,
            activityId: input.activityId,
          },
        },
      });

      if (existing && !existing.canceledAt) {
        const refreshed = await tx.activity.findUnique({ where: { id: input.activityId } });
        const reg = await tx.registration.findUnique({
          where: { userId_activityId: { userId: input.userId, activityId: input.activityId } },
        });
        return { activity: refreshed!, registration: reg! };
      }

      // Validate time/state and capacity against latest values.
      this.ensureRegisterable(activity, now);

      const updated = await tx.activity.updateMany({
        where: {
          id: input.activityId,
          registeredCount: { lt: activity.capacity },
          status: { in: ['published', 'full'] },
        },
        data: {
          registeredCount: { increment: 1 },
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException({
          code: ErrorCodes.FULL,
          message: 'Activity is full',
        });
      }

      const registration = existing
        ? await tx.registration.update({
            where: { userId_activityId: { userId: input.userId, activityId: input.activityId } },
            data: { canceledAt: null, createdAt: now },
          })
        : await tx.registration.create({
            data: {
              userId: input.userId,
              activityId: input.activityId,
              createdAt: now,
            },
          });

      await syncActivityStatusWithCapacity(tx as any, input.activityId);

      const refreshed = await tx.activity.findUnique({ where: { id: input.activityId } });
      return { activity: refreshed!, registration };
    });

    await this.audit.write({
      actorUserId: input.userId,
      action: 'registration.register',
      targetType: 'activity',
      targetId: input.activityId,
      result: AuditResult.success,
      metadata: { registrationId: result.registration.id },
    });

    return {
      activityId: input.activityId,
      registeredCount: result.activity.registeredCount,
      capacity: result.activity.capacity,
      status: result.activity.status,
      registration: presentRegistration(result.registration),
    };
  }

  async cancel(input: { activityId: string; userId: string }) {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({ where: { id: input.activityId } });
      if (!activity) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Not found' });
      }

      if (activity.status === 'closed') {
        throw new ConflictException({
          code: ErrorCodes.CLOSED,
          message: 'Registration closed',
        });
      }

      if (activity.status !== 'published' && activity.status !== 'full') {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Not allowed',
        });
      }

      if (now.getTime() >= activity.date.getTime()) {
        throw new ConflictException({
          code: ErrorCodes.ENDED,
          message: 'Activity already ended',
        });
      }

      if (now.getTime() >= activity.deadline.getTime()) {
        throw new ConflictException({
          code: ErrorCodes.DEADLINE_PASSED,
          message: 'Deadline passed',
        });
      }

      const existing = await tx.registration.findUnique({
        where: {
          userId_activityId: {
            userId: input.userId,
            activityId: input.activityId,
          },
        },
      });

      if (!existing || existing.canceledAt) {
        throw new NotFoundException({ code: ErrorCodes.NOT_FOUND, message: 'Not found' });
      }

      const registration = await tx.registration.update({
        where: {
          userId_activityId: {
            userId: input.userId,
            activityId: input.activityId,
          },
        },
        data: {
          canceledAt: now,
        },
      });

      if (activity.registeredCount <= 0) {
        throw new ConflictException({
          code: ErrorCodes.CONFLICT,
          message: 'Invalid registeredCount',
        });
      }

      await tx.activity.update({
        where: { id: input.activityId },
        data: {
          registeredCount: { decrement: 1 },
        },
      });

      await syncActivityStatusWithCapacity(tx as any, input.activityId);

      const refreshed = await tx.activity.findUnique({ where: { id: input.activityId } });
      return { activity: refreshed!, registration };
    });

    await this.audit.write({
      actorUserId: input.userId,
      action: 'registration.cancel',
      targetType: 'activity',
      targetId: input.activityId,
      result: AuditResult.success,
      metadata: { registrationId: result.registration.id },
    });

    return {
      activityId: input.activityId,
      registeredCount: result.activity.registeredCount,
      capacity: result.activity.capacity,
      status: result.activity.status,
      registration: presentRegistration(result.registration),
    };
  }
}
