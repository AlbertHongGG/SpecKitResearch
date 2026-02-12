import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditResult, type ActivityStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { presentActivity } from '../activities/activity.presenter';
import {
  applyActivityTransition,
  type ActivityTransitionAction,
} from '../activities/activity-state-machine';
import { ErrorCodes } from '../common/errors/error-codes';
import { PrismaService } from '../common/prisma/prisma.service';

function validateDateDeadline(date: Date, deadline: Date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new UnprocessableEntityException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: { field: 'date' },
    });
  }
  if (!(deadline instanceof Date) || Number.isNaN(deadline.getTime())) {
    throw new UnprocessableEntityException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: { field: 'deadline' },
    });
  }
  if (date.getTime() <= deadline.getTime()) {
    throw new UnprocessableEntityException({
      code: ErrorCodes.VALIDATION_ERROR,
      message: 'Validation failed',
      details: { rule: 'date_after_deadline' },
    });
  }
}

@Injectable()
export class AdminActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list() {
    const items = await this.prisma.activity.findMany({
      orderBy: { updatedAt: 'desc' },
    });

    return { items: items.map(presentActivity) };
  }

  async create(input: {
    actorUserId: string;
    title: string;
    description: string;
    date: Date;
    deadline: Date;
    location: string;
    capacity: number;
  }) {
    validateDateDeadline(input.date, input.deadline);

    const activity = await this.prisma.activity.create({
      data: {
        title: input.title,
        description: input.description,
        date: input.date,
        deadline: input.deadline,
        location: input.location,
        capacity: input.capacity,
        registeredCount: 0,
        status: 'draft',
        createdByUserId: input.actorUserId,
      },
    });

    await this.audit.write({
      actorUserId: input.actorUserId,
      action: 'activity.create',
      targetType: 'activity',
      targetId: activity.id,
      result: AuditResult.success,
    });

    return presentActivity(activity);
  }

  async update(input: {
    actorUserId: string;
    activityId: string;
    title?: string;
    description?: string;
    date?: Date;
    deadline?: Date;
    location?: string;
    capacity?: number;
  }) {
    const existing = await this.prisma.activity.findUnique({
      where: { id: input.activityId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }

    const nextDate = input.date ?? existing.date;
    const nextDeadline = input.deadline ?? existing.deadline;
    validateDateDeadline(nextDate, nextDeadline);

    const nextCapacity = input.capacity ?? existing.capacity;
    if (nextCapacity < existing.registeredCount) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Capacity cannot be less than registeredCount',
      });
    }

    const updated = await this.prisma.activity.update({
      where: { id: input.activityId },
      data: {
        title: input.title,
        description: input.description,
        date: input.date,
        deadline: input.deadline,
        location: input.location,
        capacity: input.capacity,
      },
    });

    await this.audit.write({
      actorUserId: input.actorUserId,
      action: 'activity.update',
      targetType: 'activity',
      targetId: updated.id,
      result: AuditResult.success,
    });

    return presentActivity(updated);
  }

  async transition(input: {
    actorUserId: string;
    activityId: string;
    action: ActivityTransitionAction;
  }) {
    const existing = await this.prisma.activity.findUnique({
      where: { id: input.activityId },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }

    const nextStatus = applyActivityTransition({
      from: existing.status as ActivityStatus,
      action: input.action,
    });

    if (!nextStatus) {
      throw new ConflictException({
        code: ErrorCodes.CONFLICT,
        message: 'Invalid state transition',
        details: { from: existing.status, action: input.action },
      });
    }

    const updated = await this.prisma.activity.update({
      where: { id: input.activityId },
      data: { status: nextStatus },
    });

    await this.audit.write({
      actorUserId: input.actorUserId,
      action: `activity.${input.action}`,
      targetType: 'activity',
      targetId: updated.id,
      result: AuditResult.success,
      metadata: { from: existing.status, to: nextStatus },
    });

    return presentActivity(updated);
  }
}
