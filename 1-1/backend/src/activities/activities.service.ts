import { Injectable } from '@nestjs/common'
import type { ActivityStatus } from '@prisma/client'
import { PrismaService } from '../common/prisma/prisma.service'
import { TimeService } from '../common/time/time.service'
import type { ActivityDetailDto, ActivitySummaryDto } from './dto/activity.dto'
import { ViewerStateService } from './viewer-state.service'

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly time: TimeService,
    private readonly viewerState: ViewerStateService,
  ) {}

  async listPublic(params: {
    status?: ActivityStatus
    viewerUserId?: string
  }): Promise<ActivitySummaryDto[]> {
    const statuses: ActivityStatus[] = params.status
      ? [params.status]
      : ['published', 'full']

    const now = this.time.now()

    const activities = await this.prisma.activity.findMany({
      where: {
        status: { in: statuses },
      },
      orderBy: { date: 'asc' },
      include: params.viewerUserId
        ? {
            registrations: {
              where: { userId: params.viewerUserId, canceledAt: null },
              select: { id: true },
            },
          }
        : undefined,
    })

    return activities.map((a) => {
      const isRegistered = (a as any).registrations?.length > 0
      const viewer = this.viewerState.computeSummary({
        viewerUserId: params.viewerUserId,
        isRegistered,
        status: a.status,
        remainingSlots: a.remainingSlots,
        deadline: a.deadline,
        now,
      })

      return {
        id: a.id,
        title: a.title,
        date: a.date.toISOString(),
        location: a.location,
        capacity: a.capacity,
        remaining_slots: a.remainingSlots,
        status: a.status,
        viewer,
      }
    })
  }

  async getPublicDetail(params: {
    activityId: string
    viewerUserId?: string
  }): Promise<ActivityDetailDto | null> {
    const now = this.time.now()

    const activity = await this.prisma.activity.findUnique({
      where: { id: params.activityId },
      include: params.viewerUserId
        ? {
            registrations: {
              where: { userId: params.viewerUserId, canceledAt: null },
              select: { id: true },
            },
          }
        : undefined,
    })

    if (!activity) return null

    const isRegistered = (activity as any).registrations?.length > 0
    const viewer = this.viewerState.computeDetail({
      viewerUserId: params.viewerUserId,
      isRegistered,
      status: activity.status,
      remainingSlots: activity.remainingSlots,
      deadline: activity.deadline,
      date: activity.date,
      now,
    })

    return {
      id: activity.id,
      title: activity.title,
      date: activity.date.toISOString(),
      location: activity.location,
      capacity: activity.capacity,
      remaining_slots: activity.remainingSlots,
      status: activity.status,
      viewer,
      description: activity.description,
      deadline: activity.deadline.toISOString(),
      created_by: activity.createdById,
      created_at: activity.createdAt.toISOString(),
      updated_at: activity.updatedAt.toISOString(),
    }
  }
}
