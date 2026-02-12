import { Injectable, NotFoundException } from '@nestjs/common';
import type { Activity, Registration } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ErrorCodes } from '../common/errors/error-codes';
import { presentActivity } from './activity.presenter';
import { deriveRegistrationStatus } from './registration-status';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listVisible(input: { from?: Date; userId?: string | null }) {
    const activities = await this.prisma.activity.findMany({
      where: {
        status: { in: ['published', 'full'] },
        ...(input.from ? { date: { gte: input.from } } : {}),
      },
      orderBy: { date: 'asc' },
    });

    let registrationsByActivityId = new Map<string, Registration>();
    if (input.userId) {
      const regs = await this.prisma.registration.findMany({
        where: {
          userId: input.userId,
          activityId: { in: activities.map((a) => a.id) },
          canceledAt: null,
        },
      });
      registrationsByActivityId = new Map(regs.map((r) => [r.activityId, r]));
    }

    const now = new Date();

    return {
      items: activities.map((activity) => {
        const reg = registrationsByActivityId.get(activity.id);
        return {
          activity: presentActivity(activity),
          registrationStatus: deriveRegistrationStatus({
            activity,
            now,
            isAuthenticated: Boolean(input.userId),
            registration: reg,
          }),
        };
      }),
    };
  }

  async getVisibleDetail(input: { activityId: string; userId?: string | null }) {
    const activity = await this.prisma.activity.findFirst({
      where: {
        id: input.activityId,
        status: { in: ['published', 'full'] },
      },
    });

    if (!activity) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: 'Not found',
      });
    }

    const registration = input.userId
      ? await this.prisma.registration.findUnique({
          where: {
            userId_activityId: {
              userId: input.userId,
              activityId: activity.id,
            },
          },
        })
      : null;

    const now = new Date();

    return {
      ...presentActivity(activity),
      registrationStatus: deriveRegistrationStatus({
        activity,
        now,
        isAuthenticated: Boolean(input.userId),
        registration,
      }),
    };
  }
}
