import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { IdempotencyService } from '../common/idempotency/idempotency.service'
import { makeError } from '../common/http/error-response'
import { withSqliteRetry } from '../common/db/sqlite-retry'
import { PrismaService } from '../common/prisma/prisma.service'
import { TimeService } from '../common/time/time.service'
import { AuditService } from '../audit/audit.service'
import { ViewerStateService } from '../activities/viewer-state.service'
import type { RegisterResponseDto } from './dto/registration.dto'
import type { CancelResponseDto } from './dto/registration.dto'
import type { MyActivitiesResponseDto } from './dto/my-activities.dto'
import { assertCanCancel, assertCanRegister } from './registration.rules'
import type { ActivityStatus } from '@prisma/client'

@Injectable()
export class RegistrationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly idempotency: IdempotencyService,
    private readonly audit: AuditService,
    private readonly time: TimeService,
    private readonly viewerState: ViewerStateService,
  ) {}

  async register(params: {
    userId: string
    activityId: string
    idempotencyKey?: string
    requestId?: string
  }): Promise<RegisterResponseDto> {
    const { userId, activityId, idempotencyKey } = params

    if (idempotencyKey) {
      const { replay, recordId } = await this.idempotency.claim({
        userId,
        action: 'register',
        key: idempotencyKey,
        requestHash: activityId,
      })

      if (replay) {
        return replay.body as RegisterResponseDto
      }

      try {
        const body = await this.registerOnce({ userId, activityId })
        await this.idempotency.storeResult({ recordId, status: HttpStatus.OK, body })
        return body
      } catch (e) {
        if (e instanceof HttpException) {
          await this.idempotency.storeResult({
            recordId,
            status: e.getStatus(),
            body: e.getResponse(),
          })
        }
        throw e
      }
    }

    return this.registerOnce({ userId, activityId })
  }

  async cancel(params: {
    userId: string
    activityId: string
    idempotencyKey?: string
  }): Promise<CancelResponseDto> {
    const { userId, activityId, idempotencyKey } = params

    if (idempotencyKey) {
      const { replay, recordId } = await this.idempotency.claim({
        userId,
        action: 'cancel',
        key: idempotencyKey,
        requestHash: activityId,
      })

      if (replay) {
        return replay.body as CancelResponseDto
      }

      try {
        const body = await this.cancelOnce({ userId, activityId })
        await this.idempotency.storeResult({ recordId, status: HttpStatus.OK, body })
        return body
      } catch (e) {
        if (e instanceof HttpException) {
          await this.idempotency.storeResult({
            recordId,
            status: e.getStatus(),
            body: e.getResponse(),
          })
        }
        throw e
      }
    }

    return this.cancelOnce({ userId, activityId })
  }

  async listMyActivities(params: { userId: string }): Promise<MyActivitiesResponseDto> {
    const now = this.time.now()

    const rows = await this.prisma.registration.findMany({
      where: { userId: params.userId },
      include: { activity: true },
      orderBy: [{ activity: { date: 'asc' } }],
    })

    const items = rows.map((r) => {
      const isActive = r.canceledAt == null
      const activityTimeStatus =
        now.getTime() < r.activity.date.getTime() ? ('upcoming' as const) : ('ended' as const)

      const viewer = this.viewerState.computeSummary({
        viewerUserId: params.userId,
        isRegistered: isActive,
        status: r.activity.status as ActivityStatus,
        remainingSlots: r.activity.remainingSlots,
        deadline: r.activity.deadline,
        now,
      })

      return {
        activity: {
          id: r.activity.id,
          title: r.activity.title,
          date: r.activity.date.toISOString(),
          location: r.activity.location,
          capacity: r.activity.capacity,
          remaining_slots: r.activity.remainingSlots,
          status: r.activity.status,
          viewer,
        },
        registration_status: isActive ? ('active' as const) : ('canceled' as const),
        activity_time_status: activityTimeStatus,
      }
    })

    return { items }
  }

  private async registerOnce(params: {
    userId: string
    activityId: string
  }): Promise<RegisterResponseDto> {
    const now = this.time.now()

    const result = await withSqliteRetry(() =>
      this.prisma.$transaction(async (tx) => {
      const activity = await tx.activity.findUnique({
        where: { id: params.activityId },
      })

      if (!activity) {
        throw new HttpException(
          makeError('NOT_FOUND', 'Activity not found'),
          HttpStatus.NOT_FOUND,
        )
      }

      assertCanRegister({
        status: activity.status,
        remainingSlots: activity.remainingSlots,
        deadline: activity.deadline,
        now,
      })

      const existing = await tx.registration.findUnique({
        where: {
          userId_activityId: {
            userId: params.userId,
            activityId: params.activityId,
          },
        },
      })

      if (existing && existing.canceledAt == null) {
        const activityDto = this.mapActivityDetail({
          activity,
          viewerUserId: params.userId,
          isRegistered: true,
          now,
        })

        return {
          registration_state: 'already_registered' as const,
          activity: activityDto,
        }
      }

      const dec = await tx.activity.updateMany({
        where: {
          id: params.activityId,
          remainingSlots: { gt: 0 },
          status: 'published',
        },
        data: {
          remainingSlots: { decrement: 1 },
        },
      })

      if (dec.count !== 1) {
        throw new HttpException(makeError('FULL', '活動名額已滿'), HttpStatus.CONFLICT)
      }

      if (existing) {
        await tx.registration.update({
          where: {
            userId_activityId: {
              userId: params.userId,
              activityId: params.activityId,
            },
          },
          data: {
            canceledAt: null,
          },
        })
      } else {
        await tx.registration.create({
          data: {
            userId: params.userId,
            activityId: params.activityId,
          },
        })
      }

      const updated = await tx.activity.findUnique({
        where: { id: params.activityId },
      })

      if (!updated) {
        throw new HttpException(
          makeError('INTERNAL', 'Unexpected missing activity'),
          HttpStatus.INTERNAL_SERVER_ERROR,
        )
      }

      let finalActivity = updated
      if (updated.remainingSlots === 0 && updated.status === 'published') {
        finalActivity = await tx.activity.update({
          where: { id: updated.id },
          data: { status: 'full' },
        })
      }

      const activityDto = this.mapActivityDetail({
        activity: finalActivity,
        viewerUserId: params.userId,
        isRegistered: true,
        now,
      })

      return {
        registration_state: 'registered' as const,
        activity: activityDto,
      }
      }),
    )

    await this.audit.log({
      action: 'REGISTER',
      actorUserId: params.userId,
      entityType: 'activity',
      entityId: params.activityId,
      metadata: { result: result.registration_state },
    })

    return result
  }

  private async cancelOnce(params: {
    userId: string
    activityId: string
  }): Promise<CancelResponseDto> {
    const now = this.time.now()

    try {
      const result = await withSqliteRetry(() =>
        this.prisma.$transaction(async (tx) => {
        const activity = await tx.activity.findUnique({
          where: { id: params.activityId },
        })

        if (!activity) {
          throw new HttpException(makeError('NOT_FOUND', 'Activity not found'), HttpStatus.NOT_FOUND)
        }

        assertCanCancel({
          deadline: activity.deadline,
          date: activity.date,
          now,
        })

        const existing = await tx.registration.findUnique({
          where: {
            userId_activityId: {
              userId: params.userId,
              activityId: params.activityId,
            },
          },
        })

        if (!existing || existing.canceledAt != null) {
          const activityDto = this.mapActivityDetail({
            activity,
            viewerUserId: params.userId,
            isRegistered: false,
            now,
          })

          return {
            registration_state: 'already_canceled' as const,
            activity: activityDto,
          }
        }

        const inc = await tx.activity.updateMany({
          where: {
            id: params.activityId,
            remainingSlots: { lt: activity.capacity },
          },
          data: {
            remainingSlots: { increment: 1 },
          },
        })

        if (inc.count !== 1) {
          throw new HttpException(
            makeError('INTERNAL', 'Unexpected remaining slots state'),
            HttpStatus.INTERNAL_SERVER_ERROR,
          )
        }

        await tx.registration.update({
          where: {
            userId_activityId: {
              userId: params.userId,
              activityId: params.activityId,
            },
          },
          data: {
            canceledAt: now,
          },
        })

        const updated = await tx.activity.findUnique({ where: { id: params.activityId } })
        if (!updated) {
          throw new HttpException(makeError('INTERNAL', 'Unexpected missing activity'), HttpStatus.INTERNAL_SERVER_ERROR)
        }

        let finalActivity = updated
        if (updated.status === 'full' && updated.remainingSlots > 0) {
          finalActivity = await tx.activity.update({
            where: { id: updated.id },
            data: { status: 'published' },
          })
        }

        const activityDto = this.mapActivityDetail({
          activity: finalActivity,
          viewerUserId: params.userId,
          isRegistered: false,
          now,
        })

        return {
          registration_state: 'canceled' as const,
          activity: activityDto,
        }
        }),
      )

      await this.audit.log({
        action: 'CANCEL',
        actorUserId: params.userId,
        entityType: 'activity',
        entityId: params.activityId,
        metadata: { result: result.registration_state },
      })

      return result
    } catch (e) {
      if (e instanceof HttpException) {
        const response = e.getResponse() as any
        await this.audit.log({
          action: 'CANCEL',
          actorUserId: params.userId,
          entityType: 'activity',
          entityId: params.activityId,
          metadata: {
            error_status: e.getStatus(),
            error_code: response?.code,
          },
        })
      }
      throw e
    }
  }

  private mapActivityDetail(params: {
    activity: {
      id: string
      title: string
      description: string
      date: Date
      deadline: Date
      location: string
      capacity: number
      remainingSlots: number
      status: any
      createdById: string
      createdAt: Date
      updatedAt: Date
    }
    viewerUserId?: string
    isRegistered: boolean
    now: Date
  }) {
    const viewer = this.viewerState.computeDetail({
      viewerUserId: params.viewerUserId,
      isRegistered: params.isRegistered,
      status: params.activity.status as ActivityStatus,
      remainingSlots: params.activity.remainingSlots,
      deadline: params.activity.deadline,
      date: params.activity.date,
      now: params.now,
    })

    return {
      id: params.activity.id,
      title: params.activity.title,
      date: params.activity.date.toISOString(),
      location: params.activity.location,
      capacity: params.activity.capacity,
      remaining_slots: params.activity.remainingSlots,
      status: params.activity.status,
      viewer,
      description: params.activity.description,
      deadline: params.activity.deadline.toISOString(),
      created_by: params.activity.createdById,
      created_at: params.activity.createdAt.toISOString(),
      updated_at: params.activity.updatedAt.toISOString(),
    }
  }
}
